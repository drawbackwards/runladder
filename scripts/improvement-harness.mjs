/**
 * Ladder IMPROVEMENT-DETECTION harness (#343).
 *
 * The consistency harness proves SAMENESS (identical input -> identical score).
 * This proves the tool's actual PURPOSE: that a genuine UX improvement moves the
 * score in the right direction, repeatably, by MORE than the noise floor.
 *
 * It renders hand-authored variants of the same screen at known-different UX
 * quality (scripts/improvement-fixtures/*.html) to PNGs via local Chrome, scores
 * each N times with the cache BYPASSED, and reports:
 *   - each variant's score spread across N runs (its own noise floor)
 *   - the delta between variants, and whether the ranking is clean + stable
 *
 * Run (needs a real ANTHROPIC_API_KEY in .env.local + local Chrome):
 *   unset ANTHROPIC_API_KEY && npx tsx scripts/improvement-harness.mjs
 *
 * NOT wired into CI — live model calls. Manual guardrail for humans.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true);
const { scoreImage } = await import("../src/lib/scoring.ts");

const RUNS = Number(process.env.RUNS || 5);
const CHROME_PATH =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DIR = join(dirname(fileURLToPath(import.meta.url)), "improvement-fixtures");

/* Ordered worst -> best. Each entry: the variant name + its HTML file. Scores
 * should rise monotonically along this order if the tool detects improvement. */
const ORDER = ["bad", "mid", "good"];
const files = readdirSync(DIR).filter((f) => f.endsWith(".html"));
// group by screen prefix (e.g. "signup") so we compare like-for-like
const screens = {};
for (const f of files) {
  const m = f.match(/^(.*)-(bad|mid|good)\.html$/);
  if (!m) continue;
  (screens[m[1]] ??= {})[m[2]] = f;
}

async function render(browser, file) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto("file://" + join(DIR, file), { waitUntil: "networkidle0" });
  const buf = await page.screenshot({ type: "png" });
  await page.close();
  // puppeteer-core v24 returns a Uint8Array; Buffer.from(...) is required for
  // valid base64 (Uint8Array.toString("base64") does NOT encode).
  return Buffer.from(buf).toString("base64");
}

async function scoreN(b64) {
  const scores = [];
  for (let i = 0; i < RUNS; i++) {
    try {
      const r = await scoreImage(
        { mediaType: "image/png", base64Data: b64 },
        { bypassCache: true },
      );
      if (r && typeof r.score === "number") scores.push(r.score);
      else console.warn("  (run skipped: no score)", r?.error || "");
    } catch (e) {
      console.warn("  (run errored, skipped):", e?.message || e);
    }
  }
  return scores;
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const spread = (a) => (a.length ? +(Math.max(...a) - Math.min(...a)).toFixed(2) : null);

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=2"],
});

console.log(`\nImprovement-detection harness (#343) | runs each: ${RUNS} | cache: BYPASSED\n`);

for (const [screen, variants] of Object.entries(screens)) {
  const present = ORDER.filter((v) => variants[v]);
  console.log(`── ${screen} (${present.join(" -> ")}) ──`);
  const results = {};
  for (const v of present) {
    const b64 = await render(browser, variants[v]);
    const scores = await scoreN(b64);
    results[v] = scores;
    console.log(
      `  ${v.padEnd(5)} mean=${mean(scores)?.toFixed(2)} spread=${spread(scores)} runs=[${scores.join(", ")}]`,
    );
  }
  // Deltas + clean-separation check along the worst->best order.
  for (let i = 1; i < present.length; i++) {
    const lo = results[present[i - 1]];
    const hi = results[present[i]];
    const delta = +(mean(hi) - mean(lo)).toFixed(2);
    const cleanlySeparated = Math.min(...hi) > Math.max(...lo);
    const noiseFloor = Math.max(spread(lo), spread(hi));
    console.log(
      `  Δ ${present[i - 1]}→${present[i]}: +${delta} | clean-separation=${cleanlySeparated} | noise-floor=${noiseFloor} | signal>noise=${delta > noiseFloor}`,
    );
  }
  console.log("");
}

await browser.close();
console.log("Target: monotonic rise worst→best, deltas cleanly above the noise floor.\n");
