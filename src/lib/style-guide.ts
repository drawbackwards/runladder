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

/** What scoring needs about a team's style guide: the ruleset + team name. */
export type OrgStyleGuide = {
  ruleset: string;
  teamName: string | null;
};

/** Read an org's stored style guide, or null if none is set. */
export async function getOrgStyleGuide(
  orgId: string,
): Promise<OrgStyleGuide | null> {
  const v = await redis.get<OrgStyleGuide>(styleGuideKey(orgId));
  return v && typeof v.ruleset === "string" && v.ruleset.trim().length > 0
    ? { ruleset: v.ruleset, teamName: v.teamName ?? null }
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
  });
}

/** Remove an org's style guide (on delete). */
export async function clearOrgStyleGuide(orgId: string): Promise<void> {
  await redis.del(styleGuideKey(orgId));
}

const DISTILL_SYSTEM = `You convert a brand's WRITING style guide (a PDF) into a compact, enforceable ruleset another model will use to check UI copy.

Extract ONLY actionable, checkable writing rules: tone and voice, terminology (preferred vs banned words), capitalization, punctuation, formatting conventions, grammar preferences, and product/feature naming. Ignore visual/brand-asset guidance (logos, colors, spacing) — those are out of scope here.

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

const COMPLIANCE_SYSTEM = `You are a copy editor checking a UI screen's WRITTEN TEXT against a team's style-guide ruleset.

You will receive the ruleset, then the screen's copy. The copy may come as an EXACT TEXT LISTING (the screen's real text layers — authoritative; quote from it verbatim), as an IMAGE you must read the text out of, or both. When an exact text listing is provided, treat it as the source of truth and use the image only for layout/context. Find text that violates the ruleset. Judge ONLY written copy — never comment on visual design, layout, or quality, and never produce a score.

Return ONLY valid JSON, no markdown:
{
  "findings": [
    { "originalText": "the exact text on screen", "issue": "which rule it breaks, plainly", "suggestion": "a compliant rewrite", "severity": "low", "category": "Tone" }
  ]
}

Rules:
- "severity" is one of: low | medium | high.
- "category" is one of: Tone | Terminology | Punctuation | Capitalization | Grammar | Formatting | Abbreviation | Other. Pick the closest; use "Other" only when none fit.
- Flag only genuine deviations from the PROVIDED ruleset. Never invent rules that aren't in it. If everything complies, return {"findings": []}.
- Apply each rule in CONTEXT, using common sense about conventional forms. Standard, domain-required usages are correct — not violations: US state abbreviations inside an address ("Raleigh, NC"), country/currency codes, units of measure, dates, IDs, and proper nouns. A rule like "avoid abbreviations" targets prose and UI labels, not an address or code shown in its normal form.
- Within those bounds, surface real deviations even when minor — the person reviewing can dismiss what doesn't apply, so a useful suggestion they can ignore beats silence. Don't withhold a genuine match for being small; only skip things that are correct by common convention or that the ruleset doesn't actually address.
- Quote "originalText" exactly as it appears on screen.
- Be concise.`;

/** What the compliance pass returns: the findings plus how text was sourced. */
export type StyleComplianceOutcome = {
  findings: StyleGuideFinding[];
  textSource: "exact" | "inferred";
};

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
  const textSource: "exact" | "inferred" = hasText ? "exact" : "inferred";
  if (!image && !hasText) return { findings: [], textSource };

  const content: Anthropic.MessageParam["content"] = [
    { type: "text", text: `Team style-guide ruleset:\n\n${ruleset}` },
  ];
  if (hasText) {
    content.push({ type: "text", text: formatFrameText(frameText) });
  }
  if (image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.base64Data },
    });
  }
  content.push({
    type: "text",
    text: hasText
      ? "Check the exact on-screen text above against the ruleset. Quote originalText verbatim from that listing."
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
    .filter((f): f is StyleGuideFinding => f !== null);

  return { findings, textSource };
}
