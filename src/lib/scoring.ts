/**
 * Ladder scoring engine — PROTECTED IP.
 *
 * This module runs the scoring pipeline (moderation + scoring) and owns the
 * response-shape contract. Framework data (levels, dimensions, principles,
 * AI lens, design types) lives in ./ladder-framework — the single source
 * of truth for all Ladder surfaces.
 *
 * MUST stay server-side. Never import from client components, never log
 * prompt text, never echo prompt fragments in error messages.
 * See /memory/feedback_never_expose_prompts_rubric.md for the full rule.
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  ladderFullPrompt,
  ladderPerRungPrompt,
  designTypeClassifierPrompt,
  aiLensPrompt,
} from "./ladder-framework";

/* ── Content moderation prompt ── */
const MODERATION_PROMPT = `Look at this image. Is it a UI/UX screen, website, app interface, or design mockup?

Answer ONLY with valid JSON:
{
  "isUI": true,
  "isExplicit": false,
  "reason": ""
}

Rules:
- "isUI" = true if the image shows any kind of software interface, website, app, dashboard, form, or design mockup
- "isExplicit" = true if the image contains pornography, nudity, graphic violence, drug use/paraphernalia, or explicit sexual content
- If isExplicit is true OR isUI is false, explain briefly in "reason"
- Be lenient with isUI — marketing pages, landing pages, emails, presentations with UI elements all count
- Alcohol brand websites or e-commerce are fine — only flag actual substance abuse imagery`;

/**
 * Assemble the full Ladder scoring system prompt from the framework.
 * Optionally applies the AI-experience lens when the caller classifies the
 * screen as AI-powered (used by plugin/analyze for design-type-aware scoring).
 */
function buildLadderPrompt(opts: { applyAiLens?: boolean } = {}): string {
  let p = "You are the AI core of the Ladder scoring engine — the universal quality score for every experience.\n\n";
  p +=
    "You think like a principal product designer with 20 years of experience at companies like Apple, Airbnb, and Stripe. You evaluate UI screens with the precision of a design leader and the empathy of a real user.\n\n";

  p += ladderFullPrompt();

  if (opts.applyAiLens) {
    p += aiLensPrompt();
  }

  p += ladderPerRungPrompt();

  p += "RESPONSE FORMAT — Return ONLY valid JSON, no markdown:\n";
  p += `{
  "score": 2.4,
  "label": "Usable",
  "screenName": "Product Name — Screen Type",
  "summary": "One honest sentence describing the user experience",
  "next": "One specific action to move to the next level",
  "rungs": {
    "meaningful":  { "score": 1.0, "summary": "No unique value or attachment." },
    "delightful":  { "score": 1.0, "summary": "No anticipation of user needs." },
    "comfortable": { "score": 1.4, "summary": "Not intuitive. Users must think about the interface." },
    "usable":      { "score": 2.1, "summary": "Effort required. Patterns inconsistent across screens." },
    "functional":  { "score": 3.8, "summary": "Core tasks completable but feedback states missing." }
  },
  "findings": [
    {
      "title": "Short title max 6 words",
      "impact": "Issue from user perspective",
      "fix": "Specific fix with exact values",
      "category": "hierarchy|spacing|copy|a11y|navigation|visual",
      "region": "Describe where on screen this issue lives — e.g. 'top navigation bar', 'hero section center', 'bottom-left card grid', 'primary CTA button area'. Be specific enough that someone could crop that area from the screenshot.",
      "uplift": 0.3,
      "targetLevel": "Comfortable",
      "rung": "comfortable"
    }
  ]
}\n\n`;

  p += "SCREEN NAME RULES:\n";
  p +=
    '- "screenName" identifies the product and screen type, e.g. "ESPN — Homepage", "Figma — Canvas Editor", "Airbnb — Search Results", "Stripe — Dashboard"\n';
  p +=
    "- If you can identify the brand/product, use its real name. If not, describe what it is: \"Banking App — Transaction History\", \"E-commerce — Product Detail\"\n";
  p += '- Format: "Product Name — Screen Type" (use an em dash)\n';
  p += "- Keep it short: max 6 words total\n\n";

  p += "FINDING RULES:\n";
  p += "- Return exactly 4 findings, ranked by impact (highest uplift first)\n";
  p += "- Write from the user's perspective, not the designer's\n";
  p +=
    '- "uplift" is how many points this single fix would add to the score (0.1 to 0.5). Be honest — most fixes are 0.1 to 0.2. Only truly fundamental issues get 0.3+\n';
  p +=
    '- "targetLevel" is the Ladder level the screen would reach IF this fix (combined with all higher-ranked fixes) were applied\n';
  p +=
    '- "region" must describe a specific visual area of the screenshot so it can be highlighted\n';
  p +=
    '- "rung" is which rung this finding primarily impacts (functional|usable|comfortable|delightful|meaningful)\n';

  return p;
}

export type MediaType =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/gif";

export type ScoreFinding = {
  title: string;
  impact: string;
  fix: string;
  category: string;
  region: string;
  uplift: number;
  targetLevel: string;
  rung: string;
};

export type ScoreResult = {
  score: number;
  label: string;
  screenName?: string;
  summary: string;
  next?: string;
  rungs?: Record<
    string,
    { score: number; summary: string }
  >;
  findings?: ScoreFinding[];
};

export type ScoringError = {
  error: string;
  status: number;
};

/**
 * Parse a data URL into its base64 payload + media type.
 * Returns null if the input isn't a supported image data URL.
 */
export function parseImageDataUrl(
  image: unknown,
): { mediaType: MediaType; base64Data: string } | null {
  if (typeof image !== "string") return null;
  const match = image.match(
    /^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/,
  );
  if (!match) return null;
  return {
    mediaType: match[1] as MediaType,
    base64Data: match[3],
  };
}

/**
 * Run the Ladder scoring pipeline on a single image.
 * Handles moderation + scoring + parsing.
 * Returns either a ScoreResult or a ScoringError with generic messaging.
 *
 * @param applyAiLens — when true, shifts upper rungs per AI_EXPERIENCE_LENS
 *   (used when the caller has classified the screen as AI-powered).
 */
export async function scoreImage(
  {
    mediaType,
    base64Data,
  }: {
    mediaType: MediaType;
    base64Data: string;
  },
  opts: { applyAiLens?: boolean } = {},
): Promise<ScoreResult | ScoringError> {
  // Cap image size (~5MB base64)
  if (base64Data.length > 7_000_000) {
    return {
      error: "Image too large. Please use an image under 5MB.",
      status: 400,
    };
  }

  const client = new Anthropic();

  /* ── Content moderation check ── */
  const modCheck = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Data },
          },
          { type: "text", text: "Classify this image." },
        ],
      },
    ],
    system: MODERATION_PROMPT,
  });

  const modText = modCheck.content.find((b) => b.type === "text");
  if (modText && modText.type === "text") {
    try {
      const modResult = JSON.parse(
        modText.text.replace(/```json|```/g, "").trim(),
      );
      if (modResult.isExplicit) {
        return {
          error:
            "This image contains content that violates our usage policy. Ladder scores UI/UX screens only.",
          status: 400,
        };
      }
      if (!modResult.isUI) {
        return {
          error:
            "This doesn't appear to be a UI screen. Please upload a screenshot of a website, app, or design mockup.",
          status: 400,
        };
      }
    } catch {
      // If moderation parse fails, proceed with scoring (fail open for usability)
      console.warn("[LADDER:WARN] Moderation parse failed, proceeding with score");
    }
  }

  /* ── Ladder scoring ── */
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Data,
            },
          },
          {
            type: "text",
            text: "Score this screen against the Ladder framework. Be honest.",
          },
        ],
      },
    ],
    system: buildLadderPrompt(opts),
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { error: "No response from scoring engine", status: 500 };
  }

  const clean = textBlock.text.replace(/```json|```/g, "").trim();
  let result: ScoreResult;
  try {
    result = JSON.parse(clean);
  } catch {
    console.error("[LADDER:ERROR] JSON parse failed:", clean.slice(0, 200));
    return { error: "Failed to parse scoring response", status: 500 };
  }

  if (
    typeof result.score !== "number" ||
    !result.label ||
    !result.summary
  ) {
    return { error: "Invalid scoring response shape", status: 500 };
  }

  return result;
}

/** Type guard for ScoringError */
export function isScoringError(
  r: ScoreResult | ScoringError,
): r is ScoringError {
  return (r as ScoringError).error !== undefined;
}

// Re-export designTypeClassifierPrompt for callers that want to classify before scoring
export { designTypeClassifierPrompt };
