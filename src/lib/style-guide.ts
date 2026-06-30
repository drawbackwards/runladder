/**
 * Team style-guide module — PROTECTED IP (model prompts live here).
 *
 * A Team-plan team lead uploads a PDF writing style guide. On upload we
 * distill it once (Sonnet) into a compact, enforceable text "ruleset" cached
 * in Redis. At score time, a SEPARATE Sonnet pass checks the screen's copy
 * against that ruleset and returns advisory findings.
 *
 * Hard rule: style-guide findings NEVER affect the numeric Ladder score.
 * They are computed independently of scoring and attached as a separate
 * field. See scoring.ts for how they are wired in (parallel, non-blocking).
 *
 * MUST stay server-side. Never log the ruleset or prompt text to clients.
 */
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import type { MediaType } from "./scoring";
import { extractJsonObject } from "./json-extract";
import { redis } from "./redis";

/**
 * One advisory copy/writing-style finding. Mirrors what the score result and
 * the plugin's Improve Copy surface render. `severity` is a soft signal only.
 */
/**
 * Fixed category taxonomy for style findings. Ours, not the guide's — the
 * model maps each finding into one of these regardless of how the source PDF
 * is structured, so it normalizes across differently-formatted guides.
 */
export const STYLE_CATEGORIES = [
  "Tone",
  "Terminology",
  "Punctuation",
  "Capitalization",
  "Grammar",
  "Formatting",
  "Abbreviation",
  "Other",
] as const;
export type StyleCategory = (typeof STYLE_CATEGORIES)[number];

export type StyleGuideFinding = {
  /** The exact on-screen text that deviates from the guide. */
  originalText: string;
  /** What rule it breaks, in plain language. */
  issue: string;
  /** A compliant rewrite. */
  suggestion: string;
  severity: "low" | "medium" | "high";
  /** Which kind of rule it breaks — from STYLE_CATEGORIES. */
  category: StyleCategory;
};

/**
 * Outcome of the style-compliance pass, attached to a score result whenever
 * the team has a guide configured (so the UI is never silent about it):
 *   - "compliant"   — checked, no deviations → positive confirmation
 *   - "issues"      — one or more findings
 *   - "unavailable" — the check errored (still never affects the score)
 */
export type StyleGuideStatus = "compliant" | "issues" | "unavailable";

export type StyleGuideResult = {
  status: StyleGuideStatus;
  /** Team/org display name, for "Complies with {teamName} style guide" copy. */
  teamName: string | null;
  findings: StyleGuideFinding[];
  /**
   * Whether the copy we checked was the screen's GROUND-TRUTH text (Figma frame
   * layers / a URL's DOM) or text the model read out of a screenshot's pixels.
   *   - "exact"    — authoritative strings; the check is complete.
   *   - "inferred" — read from an uploaded image; may miss small/low-contrast
   *                  copy. The UI shows a best-effort caveat (see #362).
   */
  textSource: "exact" | "inferred";
};

/**
 * Ground-truth on-screen text for a screen, when a surface can provide it
 * (Figma frame layers, or a URL's rendered DOM). When present, the style check
 * judges these EXACT strings rather than reading them out of the image — which
 * is what makes style compliance consistent across surfaces (#362).
 */
export type FrameText = {
  name?: string;
  width?: number;
  height?: number;
  /** Visible text, top to bottom; may be hierarchy-labeled (e.g. '[HEADING] "Welcome"'). */
  textContent?: string[];
};

/** True when frameText carries at least one usable line of on-screen text. */
export function hasFrameText(frameText?: FrameText | null): frameText is FrameText {
  return !!frameText?.textContent && frameText.textContent.length > 0;
}

/** Render frameText into the prompt block the compliance pass reads. */
function formatFrameText(frameText: FrameText): string {
  const head =
    frameText.name || frameText.width || frameText.height
      ? `Screen: "${frameText.name ?? "untitled"}"` +
        (frameText.width && frameText.height
          ? ` (${frameText.width}x${frameText.height}px)`
          : "") +
        "\n"
      : "";
  const body = (frameText.textContent ?? []).join("\n");
  return `${head}\nExact on-screen text (top to bottom):\n${body}`;
}

/** Redis key for an org's stored style guide (ruleset + team name). */
function styleGuideKey(orgId: string): string {
  return `org:${orgId}:style-guide`;
}

/** Cap the cached ruleset so per-score prompts stay cheap and bounded. */
const MAX_RULESET_CHARS = 12_000;

/**
 * An internal contradiction/ambiguity detected in an uploaded guide (#362).
 * Advisory only: we DON'T let the team resolve it in the UI — we show how we'll
 * interpret it and tell them to edit + re-upload the guide. Surfaced on Settings,
 * not per-scan.
 */
export type StyleConflict = {
  /** Short label, e.g. "Field label capitalization". */
  topic: string;
  /** What the guide says that conflicts, in plain language. */
  summary: string;
  /** How Ladder will apply it (most-specific rule wins). */
  interpretation: string;
};

/** What scoring needs about a team's style guide: the ruleset + team name. */
export type OrgStyleGuide = {
  ruleset: string;
  teamName: string | null;
  /** Contradictions/ambiguities found in the guide at upload time (advisory). */
  conflicts?: StyleConflict[];
};

/** Read an org's stored style guide, or null if none is set. */
export async function getOrgStyleGuide(
  orgId: string,
): Promise<OrgStyleGuide | null> {
  const v = await redis.get<OrgStyleGuide>(styleGuideKey(orgId));
  return v && typeof v.ruleset === "string" && v.ruleset.trim().length > 0
    ? {
        ruleset: v.ruleset,
        teamName: v.teamName ?? null,
        conflicts: Array.isArray(v.conflicts) ? v.conflicts : [],
      }
    : null;
}

/** Store (overwrite) an org's style guide. */
export async function setOrgStyleGuide(
  orgId: string,
  data: OrgStyleGuide,
): Promise<void> {
  await redis.set(styleGuideKey(orgId), {
    ruleset: data.ruleset.slice(0, MAX_RULESET_CHARS),
    teamName: data.teamName,
    conflicts: data.conflicts ?? [],
  });
}

/** Remove an org's style guide (on delete). */
export async function clearOrgStyleGuide(orgId: string): Promise<void> {
  await redis.del(styleGuideKey(orgId));
}

/**
 * Build the ruleset the compliance check should actually use: the distilled
 * rules PLUS the resolutions for any detected internal contradictions (#362).
 *
 * A self-contradictory guide can't be resolved reliably by the model from the
 * generic prompt alone (it flip-flops). But we already DETECT the contradiction
 * at upload and decide the resolution ("most specific rule wins"). Injecting
 * those resolutions as an authoritative section turns the contradiction into a
 * single clear directive — so the prompt stays fully generic and the result is
 * deterministic. Returns the ruleset unchanged when there are no conflicts.
 */
export function rulesetWithResolutions(
  ruleset: string,
  conflicts?: StyleConflict[] | null,
): string {
  const lines = (conflicts ?? [])
    .filter((c) => c.interpretation && c.interpretation.trim().length > 0)
    .map((c) => `- ${c.topic}: ${c.interpretation.trim()}`);
  if (lines.length === 0) return ruleset;
  return `${ruleset}\n\nRESOLVED CONFLICTS — AUTHORITATIVE. This guide contradicts itself in the areas below. Apply EXACTLY these resolutions and IGNORE any general rule they override:\n${lines.join("\n")}`;
}

const DISTILL_SYSTEM = `You convert a brand's WRITING style guide (a PDF) into a compact, enforceable ruleset another model will use to check UI copy.

Extract ONLY actionable, checkable writing rules: tone and voice, terminology (preferred vs banned words), capitalization, punctuation, formatting conventions, grammar preferences, and product/feature naming. Ignore visual/brand-asset guidance (logos, colors, spacing) — those are out of scope here.

PRESERVE EACH RULE'S EXACT SCOPE — which element it governs (field labels vs section headings vs buttons vs body text, etc.). This matters enormously: a checker will apply these rules literally.
- Do NOT broaden a rule to "all UI text" or "everything" if the guide scoped it to a specific element. If the guide says "title-case page titles," write exactly that — not "title-case all UI text."
- If the guide specifies DIFFERENT conventions for different elements (e.g. sentence case for field labels but title case for page titles), keep them as SEPARATE, clearly-scoped rules. Never merge them into one blanket rule, and never let a heading/title rule imply anything about labels (or vice versa).
- State casing precisely: "sentence case (capitalize only the first word)" vs "title case (capitalize every major word)" — never just "capitalize."

Output a tight, plain-text list of rules grouped under short headings (Tone, Terminology, Formatting, Grammar, Naming). Be specific and imperative ("Use 'sign in' not 'login'"). Omit anything not about written copy. No preamble, no closing remarks. If the document contains no usable writing rules, output exactly: NO_RULES`;

/**
 * Distill an uploaded style-guide PDF into a compact text ruleset.
 * The PDF is sent natively to Claude (document block) — no PDF parser.
 * Returns the ruleset text, or null if the guide has no usable writing rules.
 */
export async function distillStyleGuide(pdfBase64: string): Promise<string | null> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            type: "text",
            text: "Distill this style guide into the ruleset described in your instructions.",
          },
        ],
      },
    ],
    system: DISTILL_SYSTEM,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return null;
  const text = textBlock.text.trim();
  if (!text || text === "NO_RULES") return null;
  return text.slice(0, MAX_RULESET_CHARS);
}

const CONFLICT_SYSTEM = `You review a brand's WRITING style guide (a PDF) for INTERNAL CONTRADICTIONS and AMBIGUITIES — places where two statements pull in different directions for the same kind of text, so a reader can't be sure which to follow. A real example: "Use title case across all content" in one place, and "Capitalize the first word of field labels" in another — those conflict for field labels (title case vs. sentence case).

Report ONLY clear, unambiguous contradictions about WRITTEN COPY (capitalization, terminology, punctuation, formatting, naming): two statements that genuinely cannot both be followed for the same element. Do NOT report visual/brand guidance, and do NOT invent conflicts. If two statements can be reasonably reconciled, or you are not sure they truly conflict, do NOT report it — leave it out. If the guide is internally consistent, return an empty list. Reason silently; do not include borderline or "possible" conflicts to be safe — only definite ones.

For each conflict, explain how Ladder will RESOLVE it when checking copy: the MOST SPECIFIC rule for an element wins (a rule that names "field labels" beats a general "all content" rule); if neither is more specific, Ladder will not flag that aspect. We do NOT ask the team to choose in the app — they edit the guide and upload a new version.

Return ONLY valid JSON, no markdown:
{
  "conflicts": [
    {
      "topic": "short label, e.g. Field label capitalization",
      "summary": "what the guide says that conflicts, in plain language, quoting both sides",
      "interpretation": "how Ladder will apply it (the most-specific rule that wins, and what that means for this element)"
    }
  ]
}
If there are no genuine conflicts, return {"conflicts": []}.`;

/**
 * Scan an uploaded guide PDF for internal contradictions/ambiguities (#362).
 * Independent of distillation; best-effort — a failure returns []. Advisory
 * output shown on the team's Settings page so they can fix + re-upload the guide.
 */
export async function detectStyleConflicts(pdfBase64: string): Promise<StyleConflict[]> {
  // Cache by the PDF's exact bytes + the prompt, so re-uploading the SAME guide
  // always yields the SAME conflicts. Detection is an open-ended "find all
  // contradictions" task that isn't perfectly deterministic even at temperature
  // 0; without this, two uploads of one file can return different sets and the
  // count appears to "drift" (#362). A changed guide hashes differently → fresh.
  const cacheKey = `style:conflicts:${createHash("sha256")
    .update(CONFLICT_SYSTEM + "\n" + pdfBase64)
    .digest("hex")
    .slice(0, 40)}`;
  try {
    const cached = await redis.get<StyleConflict[]>(cacheKey);
    if (Array.isArray(cached)) return cached;
  } catch {
    // best-effort cache read
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
          },
          {
            type: "text",
            text: "Review this style guide for internal contradictions/ambiguities about written copy.",
          },
        ],
      },
    ],
    system: CONFLICT_SYSTEM,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];
  let parsed: { conflicts?: unknown };
  try {
    parsed = JSON.parse(extractJsonObject(textBlock.text));
  } catch {
    return [];
  }
  if (!parsed || !Array.isArray(parsed.conflicts)) return [];
  const conflicts = parsed.conflicts
    .map((c): StyleConflict | null => {
      if (!c || typeof c !== "object") return null;
      const o = c as Record<string, unknown>;
      if (typeof o.topic !== "string" || typeof o.summary !== "string") return null;
      return {
        topic: o.topic,
        summary: o.summary,
        interpretation: typeof o.interpretation === "string" ? o.interpretation : "",
      };
    })
    .filter((c): c is StyleConflict => c !== null)
    .slice(0, 12);

  try {
    // 30-day TTL; key is content-addressed so it's safe to keep.
    await redis.set(cacheKey, conflicts, { ex: 60 * 60 * 24 * 30 });
  } catch {
    // best-effort cache write
  }
  return conflicts;
}

const COMPLIANCE_SYSTEM = `You are ENFORCING a team's written style guide against the text of a UI screen. Your job is PRECISION: flag only text that CLEARLY and CONFIDENTLY violates a specific rule in the provided ruleset. This is an enforcement tool — wrongly flagging copy that already complies destroys the team's trust and is worse than missing a borderline case. When in doubt, do NOT flag.

You will receive the ruleset, then the screen's copy: an EXACT TEXT LISTING (the real text layers — authoritative, quote verbatim) and/or an IMAGE you read text out of. When the listing is present, treat it as the source of truth and use the image only for layout/context. Judge ONLY written copy — never comment on visual design, layout, or quality, and never produce a score.

How to judge each piece of text:
1. Identify what it IS — a field label, button/CTA, section heading, page title, body text, etc.
2. Find the MOST SPECIFIC rule that governs that element type. A rule that names the element type explicitly outranks a broad rule that only sweeps it into "all content"/"all UI text" or a long list of elements. Never apply a rule written for one element type to a different one, and never stack a general rule on top of a specific one to demand more than the specific rule requires. If the ruleset has a "RESOLVED CONFLICTS" section, it is AUTHORITATIVE — follow it over any rule it overrides.
3. Apply the governing rule EXACTLY as written — never stricter, and never a casing it didn't state. Match the casing the rule specifies: a "capitalize the first word"/sentence-case rule is satisfied when the first word is capitalized (later words may be lowercase) — do not demand title case; a "title case"/"capitalize every word" rule requires every significant word capitalized. Apply whichever the governing rule states; do not assume a default.
4. Reason SILENTLY. Before emitting a finding, confirm to yourself the text actually VIOLATES the rule as written. If the text already satisfies the rule, the ruleset doesn't clearly address it, or rules conflict and it's ambiguous — OMIT it entirely. Do NOT emit a finding you then talk yourself out of.

The JSON is your FINAL ANSWER, not a scratchpad:
- Never include deliberation, "on reflection", "actually complies", or "no violation found" in any field. If you conclude it complies, the finding simply does not exist.
- "suggestion" MUST be a genuine rewrite that DIFFERS from "originalText". If your rewrite would equal the original, there is no violation — omit it.
- "issue" is ONE short sentence (aim for under 20 words) citing the SINGLE rule broken — not your reasoning, not a chain of rules. If a text could be read as breaking more than one rule, cite only the one your "suggestion" actually fixes.
- CONSISTENCY: when several texts break the SAME rule (e.g. "Order no" and "Model no" both abbreviate "number"), write their "issue" the SAME way and use the same category. Identical violations must read identically.

Return ONLY valid JSON, no markdown:
{
  "findings": [
    { "originalText": "the exact text on screen", "issue": "the specific rule it breaks and how", "suggestion": "a compliant rewrite", "severity": "low", "category": "Tone" }
  ]
}

Rules:
- "severity" is one of: low | medium | high.
- "category" is one of: Tone | Terminology | Punctuation | Capitalization | Grammar | Formatting | Abbreviation | Other. Pick the closest; use "Other" only when none fit.
- Flag only genuine, confident violations of the PROVIDED ruleset. Never invent or extend rules. If everything complies, return {"findings": []}.
- Apply rules in CONTEXT with common sense about conventional forms. Standard, domain-required usages are correct — not violations: US state abbreviations inside an address ("Raleigh, NC"), country/currency codes, units of measure, dates, IDs, and proper nouns.
- "issue" must name the exact rule and explain how the text violates it; if you cannot, drop the finding. Quote "originalText" exactly as it appears. Be concise.`;

/** What the compliance pass returns: the findings plus how text was sourced. */
export type StyleComplianceOutcome = {
  findings: StyleGuideFinding[];
  textSource: "exact" | "inferred";
};

const TRANSCRIBE_SYSTEM = `You transcribe EVERY piece of visible text in a UI screenshot, verbatim. Include headings, body, button labels, field labels, menu and tab labels, table cells, placeholder text, timestamps, badges, and small or low-contrast text — every string a user can read. Read carefully and do not skip small text. Do not paraphrase, translate, summarize, or add commentary. Output ONE line per distinct visible string, roughly top to bottom. No numbering, no markdown, no quotes.`;

/**
 * Best-effort transcription of all visible text in a screenshot, so the
 * style-compliance check can judge a full text listing instead of reading text
 * inline (and missing small labels/buttons). Used only for image-only inputs —
 * still "inferred", not ground truth. Returns null on failure; the caller then
 * falls back to reading the image directly.
 */
export async function transcribeScreenText(image: {
  mediaType: MediaType;
  base64Data: string;
}): Promise<FrameText | null> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: image.mediaType, data: image.base64Data },
          },
          { type: "text", text: "Transcribe every visible string in this screen." },
        ],
      },
    ],
    system: TRANSCRIBE_SYSTEM,
  });
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return null;
  const textContent = textBlock.text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 300);
  return textContent.length > 0 ? { textContent } : null;
}

/**
 * Run the style-compliance pass: the team's ruleset + the screen's copy →
 * advisory findings. Independent of scoring; callers treat a throw or empty
 * result as "no findings" and must never let it affect the score.
 *
 * Pass ground-truth `frameText` (Figma layers / URL DOM) when available — the
 * check then judges the EXACT strings and reports `textSource: "exact"`. With
 * only an `image` it reads text from pixels (`textSource: "inferred"`,
 * best-effort). At least one of `image`/`frameText` must be provided. Feeding
 * the same text on every surface is what makes findings consistent (#362).
 */
export async function analyzeStyleCompliance(
  {
    image,
    frameText,
  }: {
    image?: { mediaType: MediaType; base64Data: string } | null;
    frameText?: FrameText | null;
  },
  ruleset: string,
): Promise<StyleComplianceOutcome> {
  const hasText = hasFrameText(frameText);
  // textSource reflects whether we had GROUND-TRUTH text. An image we transcribe
  // is still "inferred" (best-effort) — the caveat must keep showing.
  const textSource: "exact" | "inferred" = hasText ? "exact" : "inferred";
  if (!image && !hasText) return { findings: [], textSource };

  // Build the text listing the check judges. Ground-truth frameText is used
  // directly. With only an image, transcribe its visible text FIRST so the
  // (precise) check sees a full listing instead of reading text inline and
  // missing small labels/buttons — this is what closes the image-upload recall
  // gap vs Figma/URL (#362). Falls back to image-only reading if transcription
  // is unavailable.
  let listing: FrameText | null = hasText ? frameText : null;
  if (!listing && image) {
    const transcribed = await transcribeScreenText(image).catch(() => null);
    if (hasFrameText(transcribed)) listing = transcribed;
  }
  const haveListing = hasFrameText(listing);

  const content: Anthropic.MessageParam["content"] = [
    { type: "text", text: `Team style-guide ruleset:\n\n${ruleset}` },
  ];
  if (hasFrameText(listing)) {
    content.push({ type: "text", text: formatFrameText(listing) });
  }
  if (image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.base64Data },
    });
  }
  content.push({
    type: "text",
    text: haveListing
      ? "Check the on-screen text listing above against the ruleset. Quote originalText verbatim from that listing."
      : "Check the written copy in this screen against the ruleset above.",
  });

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    // temperature 0: the compliance check should be as deterministic as
    // possible so the same screen yields the same findings across surfaces and
    // re-scans (#362, #343).
    temperature: 0,
    messages: [{ role: "user", content }],
    system: COMPLIANCE_SYSTEM,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return { findings: [], textSource };

  let parsed: { findings?: unknown };
  try {
    parsed = JSON.parse(extractJsonObject(textBlock.text));
  } catch {
    return { findings: [], textSource };
  }
  if (!parsed || !Array.isArray(parsed.findings)) return { findings: [], textSource };

  const allowedSeverity = new Set(["low", "medium", "high"]);
  const allowedCategory = new Set<string>(STYLE_CATEGORIES);
  const findings = parsed.findings
    .map((f): StyleGuideFinding | null => {
      if (!f || typeof f !== "object") return null;
      const o = f as Record<string, unknown>;
      if (typeof o.originalText !== "string" || typeof o.suggestion !== "string") {
        return null;
      }
      const severity = allowedSeverity.has(o.severity as string)
        ? (o.severity as StyleGuideFinding["severity"])
        : "low";
      const category = allowedCategory.has(o.category as string)
        ? (o.category as StyleCategory)
        : "Other";
      return {
        originalText: o.originalText,
        issue: typeof o.issue === "string" ? o.issue : "",
        suggestion: o.suggestion,
        severity,
        category,
      };
    })
    .filter((f): f is StyleGuideFinding => f !== null)
    // Drop NO-OP findings: a suggestion identical to (or empty vs) the original
    // is not a violation. The model sometimes "reasons aloud" and emits a
    // finding it then talks itself out of (suggestion == original); this is a
    // deterministic backstop so that never reaches the user (#362).
    .filter((f) => {
      const sug = f.suggestion.trim();
      return sug.length > 0 && sug !== f.originalText.trim();
    });

  return { findings, textSource };
}

/**
 * Content-addressed cache key: same org + ruleset + exact text + same prompt →
 * same key. Folding COMPLIANCE_SYSTEM into the hash means any change to the
 * compliance prompt automatically invalidates every cached result, so a prompt
 * fix is never masked by stale cache entries (#362).
 */
function styleCacheKey(orgId: string, ruleset: string, frameText: FrameText): string {
  const basis = `${COMPLIANCE_SYSTEM}\n===\n${ruleset}\n---\n${(frameText.textContent ?? []).join("\n")}`;
  const hash = createHash("sha256").update(basis).digest("hex").slice(0, 32);
  return `style:cache:${orgId}:${hash}`;
}

/**
 * Style compliance, computed ONCE per (org, ruleset, exact text) and reused.
 *
 * A single screen is "scanned once" from the user's point of view, so its
 * style-guide findings must be identical no matter which surface or action
 * triggers the check — the plugin's in-canvas Improve Copy, the score the
 * plugin persists, and the web dashboard that displays it (#362). Without this,
 * each call to `analyzeStyleCompliance` is an independent model call that can
 * drift (different count/categories) even at temperature 0.
 *
 * Only caches when we have ground-truth `frameText` (a stable, content-addressed
 * key) and an org. Image-only/best-effort checks always recompute. The key
 * includes the ruleset, so editing the team guide invalidates it; it includes
 * the exact text, so editing the screen produces a fresh result.
 */
export async function analyzeStyleComplianceCached(
  input: {
    image?: { mediaType: MediaType; base64Data: string } | null;
    frameText?: FrameText | null;
  },
  ruleset: string,
  orgId: string | null,
): Promise<StyleComplianceOutcome> {
  if (!orgId || !hasFrameText(input.frameText)) {
    return analyzeStyleCompliance(input, ruleset);
  }
  const key = styleCacheKey(orgId, ruleset, input.frameText);
  try {
    const cached = await redis.get<StyleComplianceOutcome>(key);
    if (cached && Array.isArray(cached.findings)) return cached;
  } catch {
    // cache read is best-effort
  }
  const outcome = await analyzeStyleCompliance(input, ruleset);
  try {
    // 24h TTL; the key is content-addressed so it's safe to keep — a changed
    // guide or changed screen produces a different key, not a stale hit.
    await redis.set(key, outcome, { ex: 60 * 60 * 24 });
  } catch {
    // cache write is best-effort
  }
  return outcome;
}
