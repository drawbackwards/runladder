/**
 * General UX copy-audit engine — PROTECTED IP (model prompts live here).
 *
 * This is the "Improve Copy" feature's GENERAL pass: it judges each visible
 * string by its copy type (CTA, heading, body, empty state, …) and suggests
 * better copy. It deliberately does NOT do team-style-guide compliance — that
 * is a SEPARATE, single source of truth (`analyzeStyleCompliance` in
 * `style-guide.ts`), so the same string is never classified two different ways
 * across surfaces (#362). The plugin's Improve Copy shows the style-guide
 * findings (from that one engine) and these general suggestions as two distinct
 * sections; the web score shows only the style-guide section for now.
 *
 * Like the style pass, this judges ground-truth `frameText` when provided
 * (Figma layers / URL DOM) and falls back to reading the image's pixels
 * otherwise. MUST stay server-side — never log the prompt to clients.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { MediaType } from "./scoring";
import { extractJsonObject } from "./json-extract";
import { hasFrameText, type FrameText } from "./style-guide";

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
};

export type GeneralCopyResult = {
  summary: string;
  rewrites: CopyRewrite[];
};

const COPY_SYSTEM = `You are a senior UX writer auditing the WRITTEN TEXT of a single UI screen. You classify every significant piece of visible text by its copy type, then evaluate it against the rules that apply to THAT type — not generic writing principles. You never comment on visual design, layout, or color, and you never produce a score.

A SEPARATE team style-guide check already handles capitalization, punctuation, abbreviations, terminology, and spelling. Do NOT flag those kinds of issues here — they will be shown to the user separately, and duplicating them is confusing. Focus on whether each string DOES ITS JOB for its type: clarity, structure, specificity, the right verb on a button, a heading that front-loads its concept, body copy that is scannable, an empty state that offers a next action.

The screen's copy may arrive as an EXACT TEXT LISTING (the real text layers — authoritative; quote "original" verbatim from it), as an IMAGE you must read the text out of, or both. When an exact listing is present, treat it as the source of truth and use the image only for context.

Different copy types have completely different goals. A nav title being short is correct, not a problem. A CTA being a noun phrase is a problem. Apply the right standard.

COPY TYPE TAXONOMY AND RULES:

nav-title — Navigation labels, tabs, sidebar items, menu items, breadcrumbs
  CORRECT: 1–3 words, noun or noun phrase. Flag only if longer than 4 words, uses verbs where a noun suffices, or uses internal jargon the user would not recognize.

section-heading — Page H1 or section H2, the visible title of a content area
  CORRECT: 3–8 words, front-loads the key concept. Flag if vague ("Overview", "Details"), company-centric, or buries the key word at the end.

card-title — Title of a card, list item header, accordion header
  CORRECT: concise noun phrase (2–6 words) describing the content. Flag if it duplicates the nav label above it, is passive, or is ambiguous without reading the body.

cta — Buttons, links that trigger an action
  CORRECT: action verb + specific object, 2–4 words. WRONG: "Submit", "Click Here", "Go", "OK", "Continue". Flag if no verb, generic verb with no object, or the outcome is ambiguous.

form-label — Label text above or beside an input field
  CORRECT: short noun phrase that matches exactly what the field captures. Flag if it uses jargon, is a full sentence, or does not match the field's purpose. (Capitalization is the style guide's job — ignore it here.)

placeholder — Ghost text inside an empty input field
  CORRECT: an example value or brief hint. Flag if it repeats the label or gives instructions better suited to helper text.

microcopy — Helper text below fields, tooltips, inline hints
  CORRECT: human, specific, reassuring. Flag if missing where anxiety is expected (password, payment, uploads), is a full paragraph, or uses legal/technical language.

error — Validation errors, system error messages
  CORRECT: states what went wrong and how to fix it, active voice, no blame, no codes. Flag if it just says "Invalid"/"Error" with no guidance or blames the user.

empty-state — Message shown when a list, feed, or section has no content
  CORRECT: explains what's missing + a clear next action. Flag if it says only "Nothing here", "No results", or "N/A".

body — Paragraph text, descriptive content, instructional copy
  CORRECT: scannable, user-focused, specific. Flag if it is a generic placeholder ("This is a description"), passive throughout, or buries the action.

CLASSIFICATION PROCESS (follow in order):
1. Look at where the text appears (nav rail, button, field label, card header, etc.).
2. Assign the most specific type from the taxonomy above.
3. Apply ONLY the rules for that type, and ONLY for copy clarity/structure (NOT style-guide compliance).
4. Only flag it if it breaks a rule for its type. If it follows the rules, skip it — do not flag correct copy.

Return ONLY a JSON object (no markdown, no preamble):
{
  "summary": "One sentence about the overall copy quality",
  "rewrites": [
    { "type": "cta", "original": "exact current text", "suggested": "improved version", "rule": "the specific rule broken, stated plainly", "rationale": "why the suggestion is better for the user" }
  ]
}

RULES:
- Include up to 8 rewrites. Only flag text that genuinely breaks a rule for its type. If the copy is strong, return fewer (or none).
- DO NOT flag capitalization, punctuation, abbreviation, terminology, or spelling — the style-guide check owns those.
- DO NOT flag nav-title text for being short. DO NOT apply CTA rules to headings. Type determines the standard.
- "original" must be the EXACT text on screen (quote it verbatim from the exact listing when provided).
- "rule" must name the specific rule broken, not generic advice. "rationale" explains the user impact.
- Order rewrites by impact — most impactful first.
- "type" must be one of: ${COPY_TYPES.join(", ")}.`;

/**
 * Run the GENERAL copy audit (no style-guide compliance — that is a separate
 * pass). Judges ground-truth `frameText` when present, else reads the image.
 * Returns an empty result on an unparseable response so callers degrade
 * gracefully. At least one of image/frameText must be provided.
 */
export async function auditCopy({
  image,
  frameText,
}: {
  image?: { mediaType: MediaType; base64Data: string } | null;
  frameText?: FrameText | null;
}): Promise<GeneralCopyResult> {
  const hasText = hasFrameText(frameText);
  const empty: GeneralCopyResult = { summary: "", rewrites: [] };
  if (!image && !hasText) return empty;

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
    text: "Audit the copy in this screen. Classify each string by type and apply that type's clarity/structure rules. Skip anything that is purely a style-guide matter.",
  });

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    // temperature 0 for consistency across re-runs (#362, #343).
    temperature: 0,
    messages: [{ role: "user", content }],
    system: COPY_SYSTEM,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return empty;

  let parsed: { summary?: unknown; rewrites?: unknown };
  try {
    parsed = JSON.parse(extractJsonObject(textBlock.text));
  } catch {
    return empty;
  }

  const allowedType = new Set<string>(COPY_TYPES);
  const rawRewrites = Array.isArray(parsed.rewrites) ? (parsed.rewrites as unknown[]) : [];
  const rewrites = rawRewrites
    .map((r): CopyRewrite | null => {
      if (!r || typeof r !== "object") return null;
      const o = r as Record<string, unknown>;
      if (typeof o.original !== "string" || typeof o.suggested !== "string") return null;
      return {
        type: allowedType.has(o.type as string) ? (o.type as CopyType) : "body",
        original: o.original,
        suggested: o.suggested,
        rule: typeof o.rule === "string" ? o.rule : "",
        rationale: typeof o.rationale === "string" ? o.rationale : "",
      };
    })
    .filter((r): r is CopyRewrite => r !== null);

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    rewrites,
  };
}
