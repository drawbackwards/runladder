/**
 * Manual eval for style-guide compliance ACCURACY (#362).
 *
 * Style-guide enforcement must be PRECISE: it must not flag copy that already
 * complies (false positives destroy trust), and it must still catch real
 * violations. The hard case is a guide with a broad rule (e.g. "title case for
 * UI text") that names an element a more specific rule also governs — the
 * specific rule must win. These scenarios lock that behavior in; run this after
 * any change to COMPLIANCE_SYSTEM / DISTILL_SYSTEM in src/lib/style-guide.ts.
 *
 * Run (needs a real ANTHROPIC_API_KEY in .env.local):
 *   unset ANTHROPIC_API_KEY && npx tsx scripts/eval-style-guide.mjs
 *
 * Not wired into CI — it makes live model calls. It's a guardrail for humans
 * editing the prompts, not an automated test.
 */
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true);

const { analyzeStyleCompliance } = await import("../src/lib/style-guide.ts");

const SCENARIOS = [
  {
    name: "broad title-case rule must NOT override specific first-word label rule",
    ruleset: `Capitalization
- Capitalize the first word of field labels.

Naming
- Use title case for UI text: page names, section headings, and labels.

Terminology
- Use "Sign in" (two words) as the verb; never "Login" or "Signin".

Abbreviation
- Approved abbreviations: OK, info, admin, IP. Spell out any other abbreviation.`,
    textContent: ['"Unit type"', '"Build by"', '"Assigned to"', '"order summary"', '"Login"'],
    // first word already capitalized → compliant under the specific label rule
    mustNotFlag: ["Unit type", "Build by", "Assigned to"],
    mustFlag: ["order summary", "Login"],
  },
  {
    name: "title case IS required for labels → real violations must be flagged",
    ruleset: `Capitalization
- Field labels: use title case — capitalize every word.

Terminology
- Use "Sign in" (two words) as the verb; never "Login" or "Signin".`,
    textContent: ['"Unit type"', '"Assigned to"', '"Order Number"', '"Login"'],
    mustNotFlag: ["Order Number"],
    mustFlag: ["Unit type", "Assigned to", "Login"],
  },
  {
    name: "clean sentence-case guide → compliant labels pass, lowercase-first flagged",
    ruleset: `Capitalization
- Field labels use sentence case: capitalize only the first word.`,
    textContent: ['"Order no"', '"Unit type"', '"order summary"'],
    mustNotFlag: ["Order no", "Unit type"],
    mustFlag: ["order summary"],
  },
  {
    name: "same violation reads identically (Order no / Model no abbreviation)",
    ruleset: `Capitalization
- Capitalize the first word of field labels.

Terminology
- Avoid abbreviations unless commonly understood. Approved: OK, info, admin, IP.`,
    textContent: ['"Order no"', '"Model no"'],
    mustFlag: ["Order no", "Model no"],
    mustNotFlag: [],
    // Both are the SAME violation ("no" → "number"); their category and issue
    // text must match so the results read consistently.
    sameRule: ["Order no", "Model no"],
  },
];

let allPass = true;
for (const s of SCENARIOS) {
  const { findings } = await analyzeStyleCompliance(
    { frameText: { name: "Eval", textContent: s.textContent } },
    s.ruleset,
  );
  const flagged = new Set(findings.map((f) => f.originalText.replace(/^"|"$/g, "")));
  const falsePositives = s.mustNotFlag.filter((t) => flagged.has(t));
  const missed = s.mustFlag.filter((t) => !flagged.has(t));
  // No-op findings (suggestion === original) must never reach the user.
  const noOps = findings.filter((f) => f.suggestion.trim() === f.originalText.trim());
  // Same-rule consistency: the named items must share a category AND an issue.
  let inconsistent = false;
  if (s.sameRule) {
    const fs = s.sameRule
      .map((t) => findings.find((f) => f.originalText.replace(/^"|"$/g, "") === t))
      .filter(Boolean);
    const cats = new Set(fs.map((f) => f.category));
    const issues = new Set(fs.map((f) => f.issue.trim().toLowerCase()));
    inconsistent = fs.length !== s.sameRule.length || cats.size > 1 || issues.size > 1;
  }
  const pass =
    falsePositives.length === 0 && missed.length === 0 && noOps.length === 0 && !inconsistent;
  allPass = allPass && pass;
  console.log(`\n${pass ? "PASS ✓" : "FAIL ✗"}  ${s.name}`);
  for (const f of findings) console.log(`    [${f.category}] "${f.originalText}" → "${f.suggestion}"  (${f.issue})`);
  if (falsePositives.length) console.log(`    false positives: ${falsePositives.join(", ")}`);
  if (missed.length) console.log(`    missed: ${missed.join(", ")}`);
  if (noOps.length) console.log(`    no-op findings: ${noOps.map((f) => f.originalText).join(", ")}`);
  if (inconsistent) console.log(`    INCONSISTENT: same-rule items differ in category or issue text`);
}
console.log(`\n${allPass ? "ALL SCENARIOS PASS ✓" : "SOME SCENARIOS FAILED ✗"}`);
process.exit(allPass ? 0 : 1);
