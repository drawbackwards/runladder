/**
 * Prompt-cache measurement (#394).
 *
 * Scores several DISTINCT screens back-to-back through the real scoring path
 * (bypassCache so each makes a live API call; skipModeration to isolate the
 * scoring call). With LADDER_LOG_USAGE on, scoring.ts prints the API `usage`
 * for each call, so you can see:
 *   - call 1: cache_creation_input_tokens ≈ system-prompt size (cache WRITE)
 *   - calls 2+: cache_read_input_tokens ≈ same (cache READ, ~0.1x input price)
 * within the 5-min ephemeral TTL — confirming the cache and the cost drop.
 *
 * Run (needs a real ANTHROPIC_API_KEY in .env.local; note the shadow unset):
 *   unset ANTHROPIC_API_KEY && npx tsx scripts/measure-prompt-cache.mjs
 *
 * NOT wired into CI — it makes live model calls and costs a few cents.
 */
process.env.LADDER_LOG_USAGE = "1";

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true);

const { scoreImage, parseImageDataUrl } = await import("../src/lib/scoring.ts");

// Haiku 4.5 list rates ($/MTok) — mirror src/lib/token-cost.ts.
const RATE = { input: 1.0, output: 5.0, cacheWrite: 1.25, cacheRead: 0.1 };
const usd = (u) =>
  ((u.input_tokens || 0) * RATE.input +
    (u.output_tokens || 0) * RATE.output +
    (u.cache_creation_input_tokens || 0) * RATE.cacheWrite +
    (u.cache_read_input_tokens || 0) * RATE.cacheRead) /
  1_000_000;

// Cost the SAME call would have been with NO caching (all input at full price).
const usdNoCache = (u) =>
  (((u.input_tokens || 0) +
    (u.cache_creation_input_tokens || 0) +
    (u.cache_read_input_tokens || 0)) *
    RATE.input +
    (u.output_tokens || 0) * RATE.output) /
  1_000_000;

const SHOTS = "public/screenshots";
const PRODUCTS = (process.env.SCREENS_LIST || "stripe,airbnb,notion,linear,figma").split(",");

function heroDataUrl(product) {
  for (const [name, mt] of [
    ["hero.png", "image/png"],
    ["hero.jpg", "image/jpeg"],
    ["hero.jpeg", "image/jpeg"],
    ["hero.webp", "image/webp"],
  ]) {
    const fp = join(SHOTS, product, name);
    if (existsSync(fp)) return `data:${mt};base64,${readFileSync(fp).toString("base64")}`;
  }
  return null;
}

console.log("Prompt-cache measurement — scoring distinct screens back-to-back\n");
for (const product of PRODUCTS) {
  const url = heroDataUrl(product);
  if (!url) {
    console.log(`skip ${product}: no hero image`);
    continue;
  }
  const parsed = parseImageDataUrl(url);
  if (!parsed) {
    console.log(`skip ${product}: bad image`);
    continue;
  }
  const r = await scoreImage(parsed, { bypassCache: true, skipModeration: true });
  const score = r && typeof r.score === "number" ? r.score : "(error)";
  console.log(`  ${product}: score ${score}`);
}

console.log(
  "\nRead the [LADDER:USAGE] lines above: call 1 should show" +
    " cache_creation_input_tokens, later calls cache_read_input_tokens.",
);
console.log(
  "Per-call cost with caching = usd(usage); without = usdNoCache(usage)" +
    " (helpers in this script mirror token-cost rates).",
);
void usd;
void usdNoCache;
