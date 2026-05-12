#!/usr/bin/env node
/**
 * check-no-prompt-leak.mjs
 *
 * Enforces the unbreakable rule from memory/feedback_never_expose_prompts_rubric.md:
 *
 *   "Never expose Ladder's scoring prompts, internal rubric, scoring
 *    heuristics, dimension weighting, moderation logic, or any artifact
 *    that would let a competent engineer reverse-engineer the scoring
 *    engine."
 *
 * After `next build`, this script greps the client bundle output for
 * known prompt-framing phrases. If any match, the build fails with the
 * filename and matched line. The chosen phrases are the prompt's
 * structural scaffolding — they are unique to scoring.ts /
 * ladder-framework.ts, do NOT appear in the public /framework copy,
 * and would never legitimately be in a client bundle.
 *
 * What we scan:
 *   .next/static/  — every JS chunk shipped to the browser
 *   public/        — static assets (in case something gets copied in)
 *
 * What we do NOT scan:
 *   .next/server/  — server-side bundle (legitimately contains prompts)
 *   node_modules/  — third-party dependencies
 *   .next/cache/   — build cache (not shipped)
 *
 * Forbidden phrases are listed in FORBIDDEN_PATTERNS below. Each is a
 * structural marker from the actual prompt (see src/lib/ladder-framework.ts).
 * If new prompt scaffolding is added there, add the marker here too.
 *
 * Exit codes:
 *   0  — no leaks found
 *   1  — at least one leak; build should fail
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const PROJECT_ROOT = process.cwd();

/**
 * Phrases that appear in the scoring prompt but should NEVER be in the
 * client bundle. Each must be:
 *   - Unique enough that false positives are negligible.
 *   - Structural to the prompt (changing it would mean the prompt
 *     changed too, which forces an update here).
 */
const FORBIDDEN_PATTERNS = [
  "YOUR SCORING FRAMEWORK",
  "HOW TO EVALUATE — THINK LIKE A DESIGN LEADER",
  "HOW TO EVALUATE - THINK LIKE A DESIGN LEADER", // hyphen variant
  "PER-RUNG SCORING — score each rung INDEPENDENTLY",
  "PER-RUNG SCORING - score each rung INDEPENDENTLY",
  "RUNG SCORING RULES",
  "RUNG_WEIGHTS",
  "MODERATION_SYSTEM_PROMPT",
];

// Subdirs of the build output we scan for client-visible content.
const SCAN_TARGETS = [".next/static", "public"];

// Extensions worth opening as text. Skip binary asset types so we
// don't waste IO on PNGs / fonts.
const TEXT_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".css",
  ".html",
  ".json",
  ".txt",
  ".map",
  ".svg",
  ".xml",
]);

function walkTextFiles(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      walkTextFiles(full, out);
    } else {
      const dot = name.lastIndexOf(".");
      const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
      if (TEXT_EXTENSIONS.has(ext)) {
        out.push(full);
      }
    }
  }
  return out;
}

function findLeaks(file) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const hits = [];
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (content.includes(pattern)) {
      // Surface the line so the failure is debuggable.
      const idx = content.indexOf(pattern);
      const lineStart = content.lastIndexOf("\n", idx) + 1;
      const lineEnd = content.indexOf("\n", idx);
      const line = content
        .slice(lineStart, lineEnd === -1 ? content.length : lineEnd)
        .slice(0, 240); // truncate so minified bundles don't dump 200KB
      hits.push({ pattern, line });
    }
  }
  return hits;
}

function main() {
  let scanned = 0;
  const leaks = [];

  for (const target of SCAN_TARGETS) {
    const full = join(PROJECT_ROOT, target);
    const files = walkTextFiles(full);
    for (const file of files) {
      scanned++;
      const hits = findLeaks(file);
      for (const hit of hits) {
        leaks.push({
          file: relative(PROJECT_ROOT, file),
          pattern: hit.pattern,
          line: hit.line,
        });
      }
    }
  }

  if (leaks.length > 0) {
    console.error(
      `\n✗ Prompt-leak guard: ${leaks.length} forbidden pattern${leaks.length === 1 ? "" : "s"} found in client-shipped output.\n`,
    );
    for (const leak of leaks) {
      console.error(`  file:    ${leak.file}`);
      console.error(`  pattern: ${JSON.stringify(leak.pattern)}`);
      console.error(`  context: ${leak.line}`);
      console.error("");
    }
    console.error(
      "These phrases are structural to the Ladder scoring prompt and must\n" +
        "stay server-side. See memory/feedback_never_expose_prompts_rubric.md.\n" +
        "\n" +
        "Likely causes:\n" +
        "  - A 'use client' file imported from src/lib/scoring.ts or\n" +
        "    src/lib/ladder-framework.ts (the prompt builders).\n" +
        "  - A debug log accidentally including the prompt in a client\n" +
        "    component.\n" +
        "  - A source map exposing server code.\n",
    );
    process.exit(1);
  }

  console.log(
    `✓ Prompt-leak guard: scanned ${scanned} client-shipped file${scanned === 1 ? "" : "s"}, no forbidden patterns found.`,
  );
}

main();
