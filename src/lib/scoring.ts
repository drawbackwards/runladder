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
 * Extract a single JSON object from arbitrary model output.
 *
 * Why this exists: smaller models (Haiku) sometimes ignore the
 * "return ONLY JSON" instruction and append explanation text, or
 * wrap the JSON in ```json fences with trailing prose. JSON.parse
 * fails on anything after the closing brace ("Unexpected
 * non-whitespace character after JSON at position N").
 *
 * Strategy: strip code fences, find the first `{`, then walk the
 * string with a tiny brace counter that respects strings + escapes
 * so we land on the matching closing `}`. Whatever the model wrote
 * before or after is discarded.
 */
function extractJsonObject(raw: string): string {
  const stripped = raw.replace(/```json|```/g, "").trim();
  const start = stripped.indexOf("{");
  if (start === -1) return stripped; // let the caller's parse fail with a useful error

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < stripped.length; i++) {
    const c = stripped[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\") {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return stripped.slice(start, i + 1);
    }
  }
  // Unbalanced braces — return what we have and let the parser fail.
  return stripped.slice(start);
}

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

  /* ── Content moderation check ──
   * Cheap classification call. No adaptive thinking, no effort tuning —
   * a binary "is this a UI screen + is it explicit" decision doesn't
   * benefit from extra reasoning depth, and we want the fast path.
   */
  const modCheck = await client.messages.create({
    model: "claude-haiku-4-5",
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

  /* ── Ladder scoring ──
   * Haiku 4.5. Explicit trade-off: Haiku scores ~0.5 lower than
   * Sonnet 4.6 on the same screen, but generates 3x faster
   * (~200 tokens/sec, sub-second TTFT) at 1/3 the cost. With
   * streaming + skeleton UX layered on top, the user sees the
   * score number 1-2 seconds after submit. Speed + UX is the
   * priority here; the streaming layer keeps the perceived
   * calibration shift small because the user gets the number
   * before they can re-anchor expectations.
   *
   * Note: Haiku doesn't support the `effort` or `thinking`
   * params and will 400 if either is passed — keep this body
   * lean. Sonnet 4.6 stays as the model of record for the
   * coming /api/improve endpoint and admin annotation analysis,
   * where the cost/quality balance flips the other way.
   */
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
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

  const clean = extractJsonObject(textBlock.text);
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

/**
 * Streaming variant of scoreImage.
 *
 * Yields events as the scoring response is generated, so callers can
 * surface partial state to the user (the score number lands seconds
 * before the full payload). Order of events:
 *
 *   1. `score` — emitted as soon as the model writes the "score":N.N field
 *   2. `label` — as soon as "label":"..." appears
 *   3. `screenName` — as soon as "screenName":"..." appears
 *   4. `complete` — once the full response is parsed (includes everything)
 *   5. `error` — on any failure (terminates the generator)
 *
 * Moderation still runs first (non-streaming) — it's a fast Haiku call
 * and rejecting non-UI / explicit images before we spend Sonnet tokens
 * is the right cost/safety order.
 */
export type ScoringStreamEvent =
  | { kind: "score"; value: number }
  | { kind: "label"; value: string }
  | { kind: "screenName"; value: string }
  | { kind: "complete"; value: ScoreResult }
  | { kind: "error"; value: string; status: number };

export async function* scoreImageStream(
  {
    mediaType,
    base64Data,
  }: { mediaType: MediaType; base64Data: string },
  opts: { applyAiLens?: boolean } = {},
): AsyncGenerator<ScoringStreamEvent> {
  if (base64Data.length > 7_000_000) {
    yield {
      kind: "error",
      value: "Image too large. Please use an image under 5MB.",
      status: 400,
    };
    return;
  }

  const client = new Anthropic();

  /* ── Moderation (Haiku, non-streaming, fast) ── */
  try {
    const modCheck = await client.messages.create({
      model: "claude-haiku-4-5",
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
          yield {
            kind: "error",
            value:
              "This image contains content that violates our usage policy. Ladder scores UI/UX screens only.",
            status: 400,
          };
          return;
        }
        if (!modResult.isUI) {
          yield {
            kind: "error",
            value:
              "This doesn't appear to be a UI screen. Please upload a screenshot of a website, app, or design mockup.",
            status: 400,
          };
          return;
        }
      } catch {
        // Fail open for usability — proceed with scoring
        console.warn("[LADDER:WARN] Moderation parse failed, proceeding with score");
      }
    }
  } catch (e) {
    console.error("[LADDER:ERROR] Moderation failed:", e);
    // Fail open — proceed to scoring
  }

  /* ── Streaming scoring call ──
   * Haiku 4.5 (matches the non-streaming scoreImage). Haiku
   * doesn't support effort/thinking — omit. The speed combined
   * with SSE means the score number lands ~1s after submit.
   */
  const stream = client.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
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

  // Accumulate text deltas. Re-scan the buffer after each chunk for
  // the small set of "early" fields the UI cares about — score,
  // label, screenName. Regexes are tolerant of the ```json fence
  // because they don't pin to start-of-string.
  let buffer = "";
  let sentScore = false;
  let sentLabel = false;
  let sentScreenName = false;

  try {
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        buffer += event.delta.text;

        if (!sentScore) {
          const m = buffer.match(/"score"\s*:\s*([\d.]+)/);
          if (m) {
            const v = parseFloat(m[1]);
            if (!isNaN(v) && v >= 1 && v <= 5) {
              sentScore = true;
              yield { kind: "score", value: v };
            }
          }
        }
        if (!sentLabel) {
          // Match the level label (Functional|Usable|Comfortable|Delightful|Meaningful).
          // Anchored to the top-level "label" key, not the per-rung
          // "rungs.<x>.score" siblings.
          const m = buffer.match(/"label"\s*:\s*"([^"]+)"/);
          if (m) {
            sentLabel = true;
            yield { kind: "label", value: m[1] };
          }
        }
        if (!sentScreenName) {
          const m = buffer.match(/"screenName"\s*:\s*"([^"]+)"/);
          if (m) {
            sentScreenName = true;
            yield { kind: "screenName", value: m[1] };
          }
        }
      }
    }

    /* ── Parse final ── */
    const final = await stream.finalMessage();
    const textBlock = final.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      yield { kind: "error", value: "No response from scoring engine", status: 500 };
      return;
    }
    const clean = extractJsonObject(textBlock.text);
    let result: ScoreResult;
    try {
      result = JSON.parse(clean);
    } catch {
      console.error("[LADDER:ERROR] JSON parse failed:", clean.slice(0, 200));
      yield { kind: "error", value: "Failed to parse scoring response", status: 500 };
      return;
    }
    if (
      typeof result.score !== "number" ||
      !result.label ||
      !result.summary
    ) {
      yield { kind: "error", value: "Invalid scoring response shape", status: 500 };
      return;
    }
    yield { kind: "complete", value: result };
  } catch (e) {
    console.error("[LADDER:ERROR] Streaming scoring failed:", e);
    yield {
      kind: "error",
      value: "Scoring failed. Please try again.",
      status: 500,
    };
  }
}
