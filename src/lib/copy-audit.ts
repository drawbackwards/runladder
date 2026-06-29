/**
 * UX copy-audit engine — PROTECTED IP (model prompts live here).
 *
 * The Figma plugin's "Improve Copy" action used to build this prompt itself and
 * call Anthropic directly, which is one of the two forked implementations of
 * style-guide checking that made results diverge across surfaces (#362). This
 * is the single canonical implementation: the plugin now calls
 * `/api/plugin/analyze/copy`, which runs this. It reuses the SAME team-style
 * ruleset source (`getOrgStyleGuide`) and the SAME category taxonomy
 * (`STYLE_CATEGORIES`) as the score-time compliance pass in `style-guide.ts`,
 * so a given string can only ever be classified one way.
 *
 * Like the compliance pass, this judges ground-truth `frameText` when provided
 * (Figma layers / URL DOM) and falls back to reading the image's pixels
 * otherwise. MUST stay server-side — never log the ruleset or prompt to clients.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { MediaType } from "./scoring";
import { extractJsonObject } from "./json-extract";
import {
  STYLE_CATEGORIES,
  hasFrameText,
  type StyleCategory,
  type FrameText,
} from "./style-guide";

/** Copy types the audit classifies each string as, then judges by its own rules. */
export const COPY_TYPES = [
  "nav-title",
  "section-heading",
  "card-title",
  "cta",
  "form-label",
  "placeholder",
  "microcopy",
  "error",
  "empty-state",
  "body",
] as const;
export type CopyType = (typeof COPY_TYPES)[number];

export type CopyRewrite = {
  type: CopyType;
  /** The exact current text on screen. */
  original: string;
  /** An improved version following the rules for this copy type. */
  suggested: string;
  /** The specific rule the original breaks. */
  rule: string;
  /** Why the suggestion is better, from the user's perspective. */
  rationale: string;
  /** True only when the rewrite is driven by the team style guide. */
  styleGuide: boolean;
  /** Set only when styleGuide is true — which kind of rule it breaks. */
  category: StyleCategory | "";
};

export type CopyAuditResult = {
  mode: "copy";
  ladder: { score: number; label: string; summary: string; next: string };
  copy: { summary: string; rewrites: CopyRewrite[] };
  /** "exact" when judged from ground-truth text, "inferred" when read from pixels. */
  textSource: "exact" | "inferred";
};

const COPY_SYSTEM = `You are a senior UX writer auditing the WRITTEN TEXT of a single UI screen. You classify every significant piece of visible text by its copy type, then evaluate it against the rules that apply to THAT type — not generic writing principles. You never comment on visual design, layout, or color, and you never invent a Ladder design score; the "ladder" you return is a judgment of COPY quality only.

The screen's copy may arrive as an EXACT TEXT LISTING (the real text layers — authoritative; quote "original" verbatim from it), as an IMAGE you must read the text out of, or both. When an exact listing is present, treat it as the source of truth and use the image only for context.

Different copy types have completely different goals. A nav title being short is correct, not a problem. A CTA being a noun phrase is a problem. Apply the right standard.

COPY TYPE TAXONOMY AND RULES:

nav-title — Navigation labels, tabs, sidebar items, menu items, breadcrumbs
  CORRECT: 1–3 words, noun or noun phrase, no verbs, no articles ("a","the"), no personal pronouns ("Your","My"), no punctuation, title case.
  CORRECT examples: "Settings", "Trip Planning", "Guest List", "Flight Details"
  Flag only if: longer than 4 words, uses verbs where a noun suffices, or uses internal jargon the user would not recognize.

section-heading — Page H1 or section H2, visible title of a content area
  CORRECT: 3–8 words, clear, front-loads the key concept, may be imperative or descriptive noun phrase.
  Flag if: vague ("Overview", "Details"), company-centric instead of user-centric, buries the key word at the end.

card-title — Title of a card, list item header, accordion header
  CORRECT: Noun phrase, concise (2–6 words), describes the content inside without requiring a verb. Not action-oriented.
  Flag if: duplicates the nav label above it, uses passive voice, is ambiguous without reading the card body.

cta — Buttons, links that trigger an action
  CORRECT: Action verb + specific object, 2–4 words, describes exactly what happens on click.
  CORRECT examples: "Start Free Trial", "Add Guest", "Save Changes", "Download PDF"
  WRONG: "Submit", "Click Here", "Go", "OK", "Continue" (too generic)
  Flag if: no verb, generic verb with no object, or the outcome is ambiguous.

form-label — Label text above or beside an input field
  CORRECT: Short noun phrase (1–4 words), unambiguous, matches exactly what the field captures, no trailing colon.
  Flag if: uses jargon, is a full sentence, or does not match the field's purpose.

placeholder — Ghost text inside an empty input field
  CORRECT: Example value ("john@email.com") or brief instruction ("e.g. 2 adults"). Never repeats the label.
  Flag if: repeats the label word-for-word, or gives instructions better suited to helper text.

microcopy — Helper text below fields, tooltips, inline hints
  CORRECT: Human, specific, reassuring. Tells the user what to expect or why information is needed. 1–2 short sentences.
  Flag if: missing where anxiety is expected (password, payment, uploads), is a full paragraph, or uses legal/technical language.

error — Validation errors, system error messages
  CORRECT: States what went wrong (specific) and how to fix it. Active voice. No blame. No jargon ("Error 422").
  Flag if: just says "Invalid" or "Error" with no guidance, blames the user, or uses a code instead of plain language.

empty-state — Message shown when a list, feed, or section has no content
  CORRECT: Explains what's missing + offers a clear next action. Human and brief.
  Flag if: says only "Nothing here", "No results", or "N/A" with no guidance.

body — Paragraph text, descriptive content, instructional copy
  CORRECT: Scannable (short sentences, active voice), user-focused, jargon-free, no unnecessary preamble.
  Flag if: starts with company name, uses passive voice throughout, or buries the action at the end.

CLASSIFICATION PROCESS (follow in order):
1. Look at where the text appears (nav rail, button, field label, card header, etc.).
2. Assign the most specific type from the taxonomy above.
3. Apply ONLY the rules for that type.
4. Only flag it if it breaks a rule for its type. If it follows the rules, skip it — do not flag correct copy.`;

const STYLE_GUIDE_BLOCK = (teamName: string) => `

TEAM STYLE GUIDE — ADDITIONAL CHECK:

In ADDITION to the general copy rules above, check the visible copy against ${teamName}'s own written style guide below. When a rewrite is driven by the style guide (not just general best-practice), set "styleGuide": true and set "category" to the kind of rule it breaks: one of ${STYLE_CATEGORIES.join(" | ")}.
PRECEDENCE: where the team style guide conflicts with the generic rules above, the TEAM STYLE GUIDE WINS — follow it.
CONTEXT: apply each rule with common sense about conventional forms. Standard usages are correct, not violations — e.g. US state abbreviations inside an address ("Raleigh, NC"), currency/unit codes, IDs, dates, and proper nouns. A rule like "avoid abbreviations" targets prose and labels, not data shown in its normal form. Surface real deviations even when minor (the reviewer can dismiss what does not apply); only withhold things correct by convention or not addressed by the guide.
Do NOT invent rules that are not in the guide. General copy issues (not from the guide) keep "styleGuide": false.`;

const OUTPUT_BLOCK = `

Return ONLY a JSON object (no markdown, no preamble):
{
  "mode": "copy",
  "ladder": { "score": 2.4, "label": "Usable", "summary": "One honest sentence about the overall copy quality", "next": "The single most impactful copy improvement" },
  "copy": {
    "summary": "One sentence about the overall copy quality",
    "rewrites": [
      { "type": "cta", "original": "exact current text", "suggested": "improved version", "rule": "the specific rule broken, stated plainly", "rationale": "why the suggestion is better for the user", "styleGuide": false, "category": "" }
    ]
  }
}

RULES:
- Include 4–8 rewrites. Only flag text that genuinely breaks a rule for its type. If everything is strong, return fewer (or none).
- DO NOT flag nav-title text for being short — short is correct for nav labels.
- DO NOT apply CTA rules to headings, or heading rules to nav titles. Type determines the standard.
- "original" must be the EXACT text on screen (quote it verbatim from the exact listing when provided).
- "rule" must name the specific rule that was broken, not generic writing advice.
- Order rewrites by impact — most impactful first.
- "type" must be one of: ${COPY_TYPES.join(", ")}.
- "label" must match the score: 1–1.99 Functional, 2–2.99 Usable, 3–3.99 Comfortable, 4–4.99 Delightful, 5 Meaningful.
- "styleGuide": true ONLY for rewrites driven by the team style guide. "category" is set only when styleGuide is true (otherwise "").`;

const LABELS: [number, string][] = [
  [1, "Functional"],
  [2, "Usable"],
  [3, "Comfortable"],
  [4, "Delightful"],
  [5, "Meaningful"],
];
function labelFor(score: number): string {
  let label = "Functional";
  for (const [min, name] of LABELS) if (score >= min) label = name;
  return label;
}

/**
 * Run the canonical UX copy audit. Judges ground-truth `frameText` when present
 * (else reads the image), optionally layering the team style guide. Throws on a
 * hard API failure; returns an empty audit on an unparseable response so the
 * caller can degrade gracefully. At least one of image/frameText is required.
 */
export async function auditCopy(
  {
    image,
    frameText,
  }: {
    image?: { mediaType: MediaType; base64Data: string } | null;
    frameText?: FrameText | null;
  },
  { ruleset, teamName }: { ruleset?: string | null; teamName?: string | null },
): Promise<CopyAuditResult> {
  const hasText = hasFrameText(frameText);
  const textSource: "exact" | "inferred" = hasText ? "exact" : "inferred";
  const empty: CopyAuditResult = {
    mode: "copy",
    ladder: { score: 3, label: "Comfortable", summary: "", next: "" },
    copy: { summary: "", rewrites: [] },
    textSource,
  };
  if (!image && !hasText) return empty;

  let system = COPY_SYSTEM;
  if (ruleset && ruleset.trim()) {
    system += STYLE_GUIDE_BLOCK(teamName?.trim() || "the team");
    system += `\n\nTEAM STYLE GUIDE RULESET:\n${ruleset}`;
  }
  system += OUTPUT_BLOCK;

  const content: Anthropic.MessageParam["content"] = [];
  if (hasText) {
    const head = frameText.name ? `Screen: "${frameText.name}"\n` : "";
    content.push({
      type: "text",
      text: `${head}Exact on-screen text (top to bottom):\n${(frameText.textContent ?? []).join("\n")}`,
    });
  }
  if (image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.base64Data },
    });
  }
  content.push({
    type: "text",
    text: "Audit the copy in this screen. Classify each string by type and apply that type's rules.",
  });

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [{ role: "user", content }],
    system,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return empty;

  let parsed: {
    ladder?: { score?: unknown; label?: unknown; summary?: unknown; next?: unknown };
    copy?: { summary?: unknown; rewrites?: unknown };
  };
  try {
    parsed = JSON.parse(extractJsonObject(textBlock.text));
  } catch {
    return empty;
  }

  const allowedType = new Set<string>(COPY_TYPES);
  const allowedCategory = new Set<string>(STYLE_CATEGORIES);
  const rawRewrites = Array.isArray(parsed.copy?.rewrites)
    ? (parsed.copy.rewrites as unknown[])
    : [];
  const rewrites = rawRewrites
    .map((r): CopyRewrite | null => {
      if (!r || typeof r !== "object") return null;
      const o = r as Record<string, unknown>;
      if (typeof o.original !== "string" || typeof o.suggested !== "string") return null;
      const styleGuide = o.styleGuide === true;
      const category =
        styleGuide && allowedCategory.has(o.category as string)
          ? (o.category as StyleCategory)
          : "";
      return {
        type: allowedType.has(o.type as string) ? (o.type as CopyType) : "body",
        original: o.original,
        suggested: o.suggested,
        rule: typeof o.rule === "string" ? o.rule : "",
        rationale: typeof o.rationale === "string" ? o.rationale : "",
        styleGuide,
        category,
      };
    })
    .filter((r): r is CopyRewrite => r !== null);

  const score =
    typeof parsed.ladder?.score === "number"
      ? Math.min(5, Math.max(1, parsed.ladder.score))
      : 3;
  return {
    mode: "copy",
    ladder: {
      score,
      label:
        typeof parsed.ladder?.label === "string" ? parsed.ladder.label : labelFor(score),
      summary: typeof parsed.ladder?.summary === "string" ? parsed.ladder.summary : "",
      next: typeof parsed.ladder?.next === "string" ? parsed.ladder.next : "",
    },
    copy: {
      summary: typeof parsed.copy?.summary === "string" ? parsed.copy.summary : "",
      rewrites,
    },
    textSource,
  };
}
