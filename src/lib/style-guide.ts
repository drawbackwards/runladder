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
};

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

const COMPLIANCE_SYSTEM = `You are a copy editor checking the WRITTEN TEXT visible in a UI screenshot against a team's style-guide ruleset.

You will receive the ruleset, then an image. Find on-screen text that violates the ruleset. Judge ONLY written copy — never comment on visual design, layout, or quality, and never produce a score.

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

/**
 * Run the style-compliance pass: the team's ruleset + the screen image →
 * advisory findings. Independent of scoring; callers treat a throw or empty
 * result as "no findings" and must never let it affect the score.
 */
export async function analyzeStyleCompliance(
  { mediaType, base64Data }: { mediaType: MediaType; base64Data: string },
  ruleset: string,
): Promise<StyleGuideFinding[]> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Team style-guide ruleset:\n\n${ruleset}`,
          },
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Data },
          },
          {
            type: "text",
            text: "Check the written copy in this screen against the ruleset above.",
          },
        ],
      },
    ],
    system: COMPLIANCE_SYSTEM,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];

  let parsed: { findings?: unknown };
  try {
    parsed = JSON.parse(extractJsonObject(textBlock.text));
  } catch {
    return [];
  }
  if (!parsed || !Array.isArray(parsed.findings)) return [];

  const allowedSeverity = new Set(["low", "medium", "high"]);
  const allowedCategory = new Set<string>(STYLE_CATEGORIES);
  return parsed.findings
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
}
