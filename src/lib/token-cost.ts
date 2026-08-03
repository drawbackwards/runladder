/**
 * Token-cost accounting (#406) — internal COGS visibility only, never
 * client-facing.
 *
 * Every Anthropic call in this repo (and the Figma plugin, which shares this
 * KV) routes its response `usage` through `recordTokenCost`, which prices the
 * tokens per model and accumulates the cost per user, per month, per category.
 * The admin Team Detail page (#397) sums current members' costs to show what a
 * client costs us to compare against what we bill them.
 *
 * RULE (documented in /hq/architecture): any new code path that makes an
 * Anthropic/LLM call MUST call recordTokenCost with a category, or its spend
 * is invisible to COGS.
 *
 * Storage: Redis hash `usage:cost:{userId}:{yyyymm}`, one field per category,
 * value = accumulated cost in MICRO-USD (integer, via HINCRBY). No TTL — unlike
 * the 40-day scan counter, cost history is retained for month-by-month review.
 * Micro-USD (1 USD = 1e6 µ$) keeps the store integer-only; the UI divides.
 */
import { redis, currentYearMonth } from "@/lib/redis";

/**
 * Billable categories — the "what are people actually using" breakdown behind
 * the Team Detail cost popover. Keep in sync with the /hq/architecture table.
 */
export type CostCategory =
  | "score" // the Ladder score itself (web / plugin / skill) — Haiku
  | "overhead" // moderation pre-check + image transcription — Haiku
  | "copy" // Improve Copy (plugin) — Sonnet
  | "a11y" // Fix Accessibility (plugin) — Sonnet
  | "style-guide" // team style-guide compliance + ambiguity — Sonnet
  | "design-system" // Design System Compliance (#400) — deterministic in v1, so $0; reserved for future model-assisted checks
  | "annotation" // annotation calibration — Sonnet
  | "chat" // plugin "Ask follow-up" chat
  | "feedback"; // plugin feedback processing

export const COST_CATEGORIES: readonly CostCategory[] = [
  "score",
  "overhead",
  "copy",
  "a11y",
  "style-guide",
  "design-system",
  "annotation",
  "chat",
  "feedback",
] as const;

/**
 * Token usage as returned by the Anthropic SDK / raw API `usage` object. The
 * SDK types the cache fields as `number | null`, so allow null here too.
 */
export type TokenUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

/**
 * Per-model rates in USD per million tokens. Because micro-USD = tokens ×
 * ($/MTok), storing $/MTok lets us compute cost with a single multiply and no
 * fractional intermediate. Cache read ≈ 0.1× input; cache write (5-min TTL) =
 * 1.25× input (Anthropic list prices via the claude-api skill, 2026-07).
 * Update these when Anthropic pricing changes or a new model is introduced.
 */
type ModelRates = {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
};

const RATES: Record<"haiku" | "sonnet", ModelRates> = {
  // claude-haiku-4-5: $1 / $5
  haiku: { input: 1.0, output: 5.0, cacheWrite: 1.25, cacheRead: 0.1 },
  // claude-sonnet-4-6: $3 / $15
  sonnet: { input: 3.0, output: 15.0, cacheWrite: 3.75, cacheRead: 0.3 },
};

/**
 * Map a model id (dated snapshot or floating alias) to its rate family.
 * Unknown models fall back to the pricier Sonnet rates and warn — for a COGS
 * guardrail, over-estimating an unpriced model beats silently dropping it.
 */
function ratesFor(model: string): ModelRates {
  const m = model.toLowerCase();
  if (m.includes("haiku")) return RATES.haiku;
  if (m.includes("sonnet")) return RATES.sonnet;
  console.warn(`[LADDER:COST] unpriced model "${model}" — using Sonnet rates`);
  return RATES.sonnet;
}

/** Cost of one call in micro-USD (integer). */
export function costMicroUsd(model: string, usage: TokenUsage): number {
  const r = ratesFor(model);
  const dollars =
    (usage.input_tokens ?? 0) * r.input +
    (usage.output_tokens ?? 0) * r.output +
    (usage.cache_creation_input_tokens ?? 0) * r.cacheWrite +
    (usage.cache_read_input_tokens ?? 0) * r.cacheRead;
  // dollars here is already in micro-USD units (tokens × $/MTok == µ$).
  return Math.round(dollars);
}

function costKey(userId: string, yyyymm: string): string {
  return `usage:cost:${userId}:${yyyymm}`;
}

/**
 * Record the cost of one Anthropic call. Best-effort and fire-and-forget:
 * callers should NOT await this on the hot path and it never throws — a cost
 * write must never break scoring.
 */
export async function recordTokenCost(args: {
  userId: string | null | undefined;
  category: CostCategory;
  model: string;
  usage: TokenUsage | null | undefined;
  /** Defaults to now; pass the score timestamp to bucket a backdated write. */
  yyyymm?: string;
}): Promise<void> {
  const { userId, category, model, usage } = args;
  if (!userId || !usage) return;
  try {
    const micro = costMicroUsd(model, usage);
    if (micro <= 0) return;
    const key = costKey(userId, args.yyyymm ?? currentYearMonth());
    await redis.hincrby(key, category, micro);
  } catch (err) {
    console.error("[LADDER:COST] record failed:", err);
  }
}

/** One user's cost for one month: total + per-category, in micro-USD. */
export async function getMonthlyCost(
  userId: string,
  yyyymm: string,
): Promise<{ total: number; byCategory: Record<string, number> }> {
  const raw = await redis.hgetall<Record<string, number | string>>(
    costKey(userId, yyyymm),
  );
  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const [cat, val] of Object.entries(raw ?? {})) {
    const n = typeof val === "number" ? val : parseInt(String(val), 10);
    if (!Number.isFinite(n)) continue;
    byCategory[cat] = n;
    total += n;
  }
  return { total, byCategory };
}

/**
 * Rough per-score cost for ESTIMATING pre-instrumentation months, where all we
 * retain is the score count (no token data). Covers the Haiku scoring call plus
 * its moderation/transcription overhead; it CANNOT see the Sonnet bonus-feature
 * calls (Improve Copy / a11y), so estimated months read low vs actual months —
 * which is why the UI tags them "Estimated". ~$0.006/score in micro-USD.
 */
export const ESTIMATED_MICRO_USD_PER_SCORE = 6000;

export function estimateScoreCostMicroUsd(scoreCount: number): number {
  return Math.max(0, Math.round(scoreCount)) * ESTIMATED_MICRO_USD_PER_SCORE;
}

/** Micro-USD → a display string like "$1.23" (or "$0.0043" when small). */
export function formatMicroUsd(micro: number): string {
  const usd = micro / 1_000_000;
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
