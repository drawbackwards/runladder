/**
 * Extract a single JSON object from arbitrary model output.
 *
 * Why this exists: models sometimes ignore the "return ONLY JSON"
 * instruction and append explanation text, or wrap the JSON in ```json
 * fences with trailing prose. JSON.parse fails on anything after the
 * closing brace ("Unexpected non-whitespace character after JSON at
 * position N").
 *
 * Strategy: strip code fences, find the first `{`, then walk the string
 * with a tiny brace counter that respects strings + escapes so we land on
 * the matching closing `}`. Whatever the model wrote before or after is
 * discarded. Callers that expect an array should prompt the model to wrap
 * it in an object (e.g. `{ "findings": [...] }`) so this stays general.
 *
 * Shared by the scoring engine and the style-guide module so both parse
 * model output the same way. Kept dependency-free on purpose.
 */
export function extractJsonObject(raw: string): string {
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
