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
import { createHash } from "crypto";
import {
  ladderFullPrompt,
  ladderPerRungPrompt,
  designTypeClassifierPrompt,
  aiLensPrompt,
} from "./ladder-framework";
import { extractJsonObject } from "./json-extract";
import { redis } from "./redis";
import { CURRENT_ENGINE_VERSION } from "./app-version";
import {
  analyzeStyleCompliance,
  hasFrameText,
  type StyleGuideResult,
  type FrameText,
} from "./style-guide";

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
  /**
   * Advisory team style-guide outcome from a SEPARATE model pass against the
   * team's uploaded guide (#team-style-guide). Present only when the caller
   * passes a team `styleRuleset`. NEVER affects the numeric `score` — computed
   * independently. Carries a status so the UI is never silent: compliant,
   * issues, or unavailable.
   */
  styleGuide?: StyleGuideResult;
};

export type ScoringError = {
  error: string;
  status: number;
};

/**
 * The score fields that are a pure function of (model, prompt, image) — i.e.
 * everything EXCEPT the org-dependent styleGuide. This is what we cache so the
 * exact same screenshot returns the exact same score (#210/#343).
 */
type CachedScore = Pick<
  ScoreResult,
  "score" | "label" | "screenName" | "summary" | "next" | "rungs" | "findings"
>;

/**
 * Content-addressed score cache key: hashes the model + the exact system prompt
 * (which encodes applyAiLens + the framework) + the image bytes. A given
 * screenshot always maps to the same score; any change to the prompt, the
 * model, or the image produces a fresh key, so there are no stale scores.
 */
function scoreCacheKey(system: string, base64Data: string): string {
  const hash = createHash("sha256")
    .update(`${CURRENT_ENGINE_VERSION}\n${SCORING_MODEL}\n${system}\n${base64Data}`)
    .digest("hex")
    .slice(0, 40);
  return `score:cache:${hash}`;
}

async function getCachedScore(key: string): Promise<CachedScore | null> {
  try {
    const v = await redis.get<CachedScore>(key);
    return v && typeof v.score === "number" ? v : null;
  } catch {
    return null; // cache read is best-effort
  }
}

async function setCachedScore(key: string, r: ScoreResult): Promise<void> {
  const core: CachedScore = {
    score: r.score,
    label: r.label,
    screenName: r.screenName,
    summary: r.summary,
    next: r.next,
    rungs: r.rungs,
    findings: r.findings,
  };
  try {
    // 30-day TTL; key is content-addressed so it's safe to keep — a changed
    // image/prompt/model produces a different key, not a stale hit.
    await redis.set(key, core, { ex: 60 * 60 * 24 * 30 });
  } catch {
    // cache write is best-effort
  }
}

/**
 * The model that turns a screen into a score (also part of the cache key).
 *
 * PINNED to a dated snapshot, not the floating `claude-haiku-4-5` alias (#343).
 * A floating alias silently re-points to new model builds over time, so a screen
 * scored today and re-scored months later could drift even at temperature 0 —
 * the engine changing under us without an engine-version bump. Pinning the
 * snapshot means the score only moves when WE deliberately change this string
 * (and bump the engine version). Changing it invalidates the score cache (the
 * model is part of the key), which is correct: a different model is a different
 * engine.
 */
const SCORING_MODEL = "claude-haiku-4-5-20251001";

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
 * Pre-scoring content gate (cheap Haiku classification). Returns a ScoringError
 * to reject (explicit content / not a UI screen) or null to proceed. Fails OPEN
 * on a parse or API error (usability beats strictness). Skipped on a score cache
 * hit — a cached score already passed this gate.
 */
async function runModeration(
  client: Anthropic,
  mediaType: MediaType,
  base64Data: string,
): Promise<ScoringError | null> {
  try {
    const modCheck = await client.messages.create({
      model: SCORING_MODEL,
      max_tokens: 200,
      temperature: 0,
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
      const modResult = JSON.parse(modText.text.replace(/```json|```/g, "").trim());
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
    }
  } catch {
    // Fail open for usability — proceed with scoring.
    console.warn("[LADDER:WARN] Moderation failed/parse error, proceeding with score");
  }
  return null;
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
  opts: {
    applyAiLens?: boolean;
    styleRuleset?: string | null;
    styleTeamName?: string | null;
    /** Ground-truth on-screen text (URL DOM / future surfaces) for the style pass. */
    styleFrameText?: FrameText | null;
    /**
     * Skip the score cache entirely (no read, no write). Used only by the
     * consistency harness (`scripts/score-consistency.mjs`) to measure the
     * model's true run-to-run variance — the thing #343 is fixing. Production
     * callers must never set this; the cache is what makes scores stable today.
     */
    bypassCache?: boolean;
    /**
     * Override the scoring temperature. Harness-only, to measure how much the
     * plugin's default-temperature path drifts vs the pinned temp 0. Production
     * callers must never set this; scoring is pinned to 0.
     */
    temperature?: number;
  } = {},
): Promise<ScoreResult | ScoringError> {
  // Cap image size (~5MB base64)
  if (base64Data.length > 7_000_000) {
    return {
      error: "Image too large. Please use an image under 5MB.",
      status: 400,
    };
  }

  const client = new Anthropic();

  // Same image + same prompt + same model → same score. We cache the score
  // (everything except the org-dependent styleGuide) so an unchanged screen
  // returns an identical score on every scan (#210/#343) instead of drifting
  // with the model's run-to-run variance.
  const system = buildLadderPrompt(opts);
  const cacheKey = scoreCacheKey(system, base64Data);
  const cached = opts.bypassCache ? null : await getCachedScore(cacheKey);

  // Moderation gate — only on a cache MISS (a cached score already passed it).
  if (!cached) {
    const modErr = await runModeration(client, mediaType, base64Data);
    if (modErr) return modErr;
  }

  // Team style-guide compliance pass, in parallel. Computed independently, never
  // feeds the numeric score, never fails the request. Runs on hit and miss
  // because it depends on the org's current ruleset (and has its own cache).
  const stylePromise = opts.styleRuleset
    ? analyzeStyleCompliance(
        { image: { mediaType, base64Data }, frameText: opts.styleFrameText },
        opts.styleRuleset,
      )
        .then((outcome) => ({ ok: true as const, ...outcome }))
        .catch((e) => {
          console.warn("[LADDER:WARN] style-guide pass failed:", e);
          return { ok: false as const };
        })
    : null;

  let result: ScoreResult;
  if (cached) {
    result = { ...cached };
  } else {
    /* ── Ladder scoring (Haiku 4.5, temperature 0 for determinism) ──
     * Haiku scores ~0.5 lower than Sonnet but is 3x faster at 1/3 the cost;
     * with streaming + skeleton UX the number lands ~1-2s after submit. Haiku
     * rejects `effort`/`thinking` (400) — keep the body lean. `temperature` is
     * supported and pinned to 0 so the same screen scores the same.
     */
    const response = await client.messages.create({
      model: SCORING_MODEL,
      max_tokens: 4096,
      temperature: opts.temperature ?? 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Data },
            },
            {
              type: "text",
              text: "Score this screen against the Ladder framework. Be honest.",
            },
          ],
        },
      ],
      system,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { error: "No response from scoring engine", status: 500 };
    }
    const clean = extractJsonObject(textBlock.text);
    try {
      result = JSON.parse(clean);
    } catch {
      console.error("[LADDER:ERROR] JSON parse failed:", clean.slice(0, 200));
      return { error: "Failed to parse scoring response", status: 500 };
    }
    if (typeof result.score !== "number" || !result.label || !result.summary) {
      return { error: "Invalid scoring response shape", status: 500 };
    }
    if (!opts.bypassCache) await setCachedScore(cacheKey, result);
  }

  if (stylePromise) {
    const outcome = await stylePromise;
    result.styleGuide = outcome.ok
      ? {
          status: outcome.findings.length > 0 ? "issues" : "compliant",
          teamName: opts.styleTeamName ?? null,
          findings: outcome.findings,
          textSource: outcome.textSource,
        }
      : {
          status: "unavailable",
          teamName: opts.styleTeamName ?? null,
          findings: [],
          textSource: hasFrameText(opts.styleFrameText) ? "exact" : "inferred",
        };
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
  opts: {
    applyAiLens?: boolean;
    styleRuleset?: string | null;
    styleTeamName?: string | null;
    /** Ground-truth on-screen text (URL DOM / future surfaces) for the style pass. */
    styleFrameText?: FrameText | null;
  } = {},
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

  const system = buildLadderPrompt(opts);
  const cacheKey = scoreCacheKey(system, base64Data);
  const cached = await getCachedScore(cacheKey);

  // Team style-guide compliance pass, in parallel. Attached to the final result
  // on hit or miss (it depends on the org's current ruleset; never feeds the score).
  const stylePromise = opts.styleRuleset
    ? analyzeStyleCompliance(
        { image: { mediaType, base64Data }, frameText: opts.styleFrameText },
        opts.styleRuleset,
      )
        .then((outcome) => ({ ok: true as const, ...outcome }))
        .catch((e) => {
          console.warn("[LADDER:WARN] style-guide pass failed:", e);
          return { ok: false as const };
        })
    : null;

  // Cache hit: synthesize the stream from the stored score — instant, and the
  // same screen always streams the same number (#210/#343). No moderation
  // needed (a cached score already passed it).
  if (cached) {
    yield { kind: "score", value: cached.score };
    if (cached.label) yield { kind: "label", value: cached.label };
    if (cached.screenName) yield { kind: "screenName", value: cached.screenName };
    const result: ScoreResult = { ...cached };
    if (stylePromise) {
      const outcome = await stylePromise;
      result.styleGuide = outcome.ok
        ? {
            status: outcome.findings.length > 0 ? "issues" : "compliant",
            teamName: opts.styleTeamName ?? null,
            findings: outcome.findings,
            textSource: outcome.textSource,
          }
        : {
            status: "unavailable",
            teamName: opts.styleTeamName ?? null,
            findings: [],
            textSource: hasFrameText(opts.styleFrameText) ? "exact" : "inferred",
          };
    }
    yield { kind: "complete", value: result };
    return;
  }

  /* ── Moderation (Haiku, non-streaming, fast) — only on a cache miss ── */
  const modErr = await runModeration(client, mediaType, base64Data);
  if (modErr) {
    yield { kind: "error", value: modErr.error, status: modErr.status };
    return;
  }

  /* ── Streaming scoring call (Haiku 4.5, temperature 0 for determinism) ──
   * Matches the non-streaming scoreImage. Haiku rejects effort/thinking; the
   * speed + SSE means the score number lands ~1s after submit.
   */
  const stream = client.messages.stream({
    model: SCORING_MODEL,
    max_tokens: 4096,
    temperature: 0,
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
    system,
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
    await setCachedScore(cacheKey, result);
    if (stylePromise) {
      const outcome = await stylePromise;
      result.styleGuide = outcome.ok
        ? {
            status: outcome.findings.length > 0 ? "issues" : "compliant",
            teamName: opts.styleTeamName ?? null,
            findings: outcome.findings,
            textSource: outcome.textSource,
          }
        : {
            status: "unavailable",
            teamName: opts.styleTeamName ?? null,
            findings: [],
            textSource: hasFrameText(opts.styleFrameText) ? "exact" : "inferred",
          };
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
