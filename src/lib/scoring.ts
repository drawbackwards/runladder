/**
 * Ladder scoring engine — PROTECTED IP.
 *
 * This module contains prompts, rubric text, moderation logic, and model
 * selection. It MUST stay server-side. Never import from client components,
 * never log prompt text, never echo prompt fragments in error messages.
 * See /memory/feedback_never_expose_prompts_rubric.md for the full rule.
 */
import Anthropic from "@anthropic-ai/sdk";

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

const LADDER_PROMPT = `You are the AI core of the Ladder scoring engine — the universal quality score for every experience.

You think like a principal product designer with 20 years of experience at companies like Apple, Airbnb, and Stripe. You evaluate UI screens with the precision of a design leader and the empathy of a real user.

THE LADDER FRAMEWORK — UX Quality Score (1.0 to 5.0):

Level 5 — MEANINGFUL (5.00): Irreplaceable. Changed how user thinks, works, lives. Can't imagine going back.
Level 4 — DELIGHTFUL (4.00–4.99): Product anticipates needs. Right help at right moment. Users refer others.
Level 3 — COMFORTABLE (3.00–3.99): No thinking required. Everything where expected. Friction removed. The modern minimum bar — must be earned.
Level 2 — USABLE (2.00–2.99): Tasks can be completed with effort. Basic structure exists. User tolerates it but would switch.
Level 1 — FUNCTIONAL (1.00–1.99): User fights the product. Trial, error, frustration. Built for engineering, not humans.

SCORING PRINCIPLES:
- Be honest. Do not flatter. Most screens are Level 1 or 2.
- Level 3 (Comfortable) is the modern minimum — it requires consistent patterns, clear hierarchy, intuitive navigation, and zero friction.
- A screen with perfect spacing but no intuitive flow caps at high 2.x.
- Upper levels measure experience quality, not just interface quality.
- Evaluate as a real user trying to accomplish a task.
- Acknowledge what a design does well before pointing out issues.

RESPONSE FORMAT — Return ONLY valid JSON, no markdown:
{
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
}

RUNG SCORING RULES:
- Score each rung INDEPENDENTLY (1.0 to 5.0): how well does this screen perform on that rung's criteria?
- A product can be strong on lower rungs and weak on upper — that's normal and expected.
- "meaningful" = is it irreplaceable? Would the user feel loss without it?
- "delightful" = does it anticipate needs? Provide contextual help? Feel assistive?
- "comfortable" = is it intuitive? Can users navigate by feel, not by reading?
- "usable" = can tasks be completed without undue effort? Are patterns consistent?
- "functional" = do basic tasks work? Can the user find and use the core feature?
- The total "score" should reflect the weighted combination — functional failures weigh more than absent delight.
- Provide a one-sentence summary per rung, from the user's perspective.

SCREEN NAME RULES:
- "screenName" identifies the product and screen type, e.g. "ESPN — Homepage", "Figma — Canvas Editor", "Airbnb — Search Results", "Stripe — Dashboard"
- If you can identify the brand/product, use its real name. If not, describe what it is: "Banking App — Transaction History", "E-commerce — Product Detail"
- Format: "Product Name — Screen Type" (use an em dash)
- Keep it short: max 6 words total

FINDING RULES:
- Return exactly 4 findings, ranked by impact (highest uplift first)
- Write from the user's perspective, not the designer's
- "uplift" is how many points this single fix would add to the score (0.1 to 0.5). Be honest — most fixes are 0.1 to 0.2. Only truly fundamental issues get 0.3+
- "targetLevel" is the Ladder level the screen would reach IF this fix (combined with all higher-ranked fixes) were applied
- "region" must describe a specific visual area of the screenshot so it can be highlighted
- "rung" is which rung this finding primarily impacts (functional|usable|comfortable|delightful|meaningful)`;

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
  image: unknown
): { mediaType: MediaType; base64Data: string } | null {
  if (typeof image !== "string") return null;
  const match = image.match(
    /^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/
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
 */
export async function scoreImage({
  mediaType,
  base64Data,
}: {
  mediaType: MediaType;
  base64Data: string;
}): Promise<ScoreResult | ScoringError> {
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
        modText.text.replace(/```json|```/g, "").trim()
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
    system: LADDER_PROMPT,
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
  r: ScoreResult | ScoringError
): r is ScoringError {
  return (r as ScoringError).error !== undefined;
}
