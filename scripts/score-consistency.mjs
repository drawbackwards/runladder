/**
 * Ladder score CONSISTENCY harness (#343, Phase 0).
 *
 * Measures the scoring engine's true run-to-run variance: it scores the same
 * unchanged image many times with the cache BYPASSED, so it measures the model,
 * not the cache. The target is exact equality — the same pixels must return the
 * same score every time. This quantifies how far today's engine is from that.
 *
 * It also writes a baseline JSON so later phases (model-measures / code-computes)
 * can prove scores did not drift wildly from where they are today.
 *
 * Run (needs a real ANTHROPIC_API_KEY in .env.local; note the shadow-var unset):
 *   unset ANTHROPIC_API_KEY && npx tsx scripts/score-consistency.mjs
 *
 * Options (env vars):
 *   RUNS=10         repeats per screen
 *   SCREENS=20      how many genuinely-unique screens to sample
 *   CONCURRENCY=5   parallel in-flight scoring calls
 *
 * NOT wired into CI — it makes live model calls and costs money. It is a manual
 * guardrail for humans working on the engine, like scripts/eval-style-guide.mjs.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true);

const { scoreImage } = await import("../src/lib/scoring.ts");

const RUNS = Number(process.env.RUNS || 10);
const SCREENS = Number(process.env.SCREENS || 20);
const CONCURRENCY = Number(process.env.CONCURRENCY || 5);
const TEMP = process.env.TEMP !== undefined ? Number(process.env.TEMP) : 0;
const SHOTS_DIR = "public/screenshots";
const OUT =
  TEMP === 0
    ? "scripts/score-consistency.baseline.json"
    : `scripts/score-consistency.temp${TEMP}.json`;

/* ── Curate genuinely-unique screens ──────────────────────────────────────
 * Each product dir holds hero/mid/lower — three vertical slices of ONE page,
 * not three screens. So we take ONE slice (hero) per product, dedupe by content
 * hash (some files are exact byte-duplicates), and sample a diverse subset. */
const PREFERRED = [
  "stripe", "airbnb", "notion", "linear", "figma", "spotify", "vercel",
  "webflow", "retool", "salesforce", "venmo", "revolut", "uber", "youtube",
  "slack", "shopify", "postman", "supabase", "raycast", "todoist",
];

function heroPath(product) {
  for (const name of ["hero.png", "hero.jpg", "hero.jpeg", "hero.webp"]) {
    const p = join(SHOTS_DIR, product, name);
    if (existsSync(p)) return p;
  }
  return null;
}

function pickScreens() {
  const allProducts = readdirSync(SHOTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const ordered = [...PREFERRED, ...allProducts.filter((p) => !PREFERRED.includes(p))];

  const seenHashes = new Set();
  const chosen = [];
  for (const product of ordered) {
    if (chosen.length >= SCREENS) break;
    const path = heroPath(product);
    if (!path) continue;
    const bytes = readFileSync(path);
    const sha = createHash("sha256").update(bytes).digest("hex");
    if (seenHashes.has(sha)) continue; // skip exact byte-duplicates
    seenHashes.add(sha);
    chosen.push({
      product,
      path,
      sha: sha.slice(0, 12),
      base64: bytes.toString("base64"),
    });
  }
  return chosen;
}

/* ── Run N scores per screen, cache bypassed ─────────────────────────────── */
async function scoreOnce(base64) {
  const res = await scoreImage(
    { mediaType: "image/png", base64Data: base64 },
    { bypassCache: true, temperature: TEMP },
  );
  if (res && typeof res.score === "number") {
    const rungs = res.rungs || {};
    return {
      score: res.score,
      label: res.label,
      rungs: Object.fromEntries(
        Object.entries(rungs).map(([k, v]) => [k, v?.score]),
      ),
    };
  }
  return { error: res?.error || "unknown scoring error" };
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function summarizeScreen(runs) {
  const scores = runs.filter((r) => typeof r.score === "number").map((r) => r.score);
  const errors = runs.length - scores.length;
  const distinct = [...new Set(scores)].sort((a, b) => a - b);
  const min = scores.length ? Math.min(...scores) : null;
  const max = scores.length ? Math.max(...scores) : null;
  const range = min !== null ? +(max - min).toFixed(2) : null;
  // per-rung spread
  const rungKeys = ["functional", "usable", "comfortable", "delightful", "meaningful"];
  const rungSpread = {};
  for (const k of rungKeys) {
    const vals = runs.map((r) => r.rungs?.[k]).filter((v) => typeof v === "number");
    if (vals.length) rungSpread[k] = +(Math.max(...vals) - Math.min(...vals)).toFixed(2);
  }
  return { scores, distinct, min, max, range, errors, rungSpread, exact: distinct.length <= 1 && errors === 0 };
}

/* ── Main ─────────────────────────────────────────────────────────────────── */
const screens = pickScreens();
console.log(`\nLadder score consistency harness (#343 Phase 0)`);
console.log(`Screens: ${screens.length} unique | Runs each: ${RUNS} | cache: BYPASSED | temp: ${TEMP}${TEMP === 1 ? " (simulates the Figma plugin's default-temp path)" : TEMP === 0 ? " (pinned engine default)" : ""}\n`);
console.log(screens.map((s) => s.product).join(", ") + "\n");

const results = [];
for (const s of screens) {
  process.stdout.write(`scoring ${s.product} x${RUNS} ... `);
  const runs = await pool(Array.from({ length: RUNS }), CONCURRENCY, () => scoreOnce(s.base64));
  const sum = summarizeScreen(runs);
  results.push({ product: s.product, path: s.path, sha: s.sha, runs, summary: sum });
  console.log(
    sum.exact
      ? `EXACT (${sum.distinct[0]})`
      : `DRIFT range=${sum.range} distinct=[${sum.distinct.join(", ")}]${sum.errors ? ` errors=${sum.errors}` : ""}`,
  );
}

/* ── Report ───────────────────────────────────────────────────────────────── */
const scored = results.filter((r) => r.summary.scores.length > 0);
const exactCount = scored.filter((r) => r.summary.exact).length;
const worst = [...scored].sort((a, b) => (b.summary.range ?? 0) - (a.summary.range ?? 0))[0];
const avgRange = scored.length
  ? +(scored.reduce((a, r) => a + (r.summary.range ?? 0), 0) / scored.length).toFixed(3)
  : null;

console.log(`\n──────── SUMMARY ────────`);
console.log(`Exactly consistent screens: ${exactCount}/${scored.length}`);
console.log(`Avg score range across ${RUNS} runs: ${avgRange}`);
if (worst) console.log(`Worst screen: ${worst.product} range=${worst.summary.range} distinct=[${worst.summary.distinct.join(", ")}]`);
console.log(`Target: exact equality (range 0.00 on every screen).`);

writeFileSync(
  OUT,
  JSON.stringify(
    { generatedAt: new Date().toISOString(), runs: RUNS, screens: results },
    null,
    2,
  ),
);
console.log(`\nBaseline written to ${OUT}\n`);
