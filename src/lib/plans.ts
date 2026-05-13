/**
 * Plan limits and tier definitions — single source of truth.
 * Keep in sync with the /pricing page and /framework copy.
 */

export type Tier = "free" | "pro" | "team" | "pulse";

/** Free-tier lifetime score quota. Shared across all surfaces (web, Skill, Figma, MCP, API). */
export const FREE_LIFETIME_LIMIT = 5;

/** Anonymous (unauthenticated) rate limit, per IP, per 24 hours. */
export const ANON_LIMIT = 1;

/**
 * Soft monthly caps shown to paid users on /pricing and the dashboard
 * usage meter. NOT hard-enforced today — we want a friendly "talk to
 * us about higher volume" nudge, not a wall. Numbers anchored to the
 * 30% COGS ceiling at each tier's price:
 *
 *   Pro:  $1,000/mo  →  $300/mo compute budget  →  ~2,000 scores soft cap
 *   Team: custom    →  default 25,000 pooled, aligned with /pricing
 *
 * If someone systematically blows past these we'll reach out manually
 * before adding hard enforcement. Keep both numbers in sync with the
 * /pricing page copy.
 */
export const PRO_MONTHLY_LIMIT = 2000;
export const TEAM_MONTHLY_POOL = 25000;

/** Tiers that bypass the free lifetime cap. */
const PAID_TIERS: ReadonlySet<Tier> = new Set(["pro", "team", "pulse"]);

export function isPaidTier(tier: Tier): boolean {
  return PAID_TIERS.has(tier);
}

/**
 * Return the soft monthly cap for a tier, or null for tiers without
 * one (Free uses the lifetime cap, Pulse is queries not scores).
 */
export function monthlyScoreCapForTier(tier: Tier): number | null {
  if (tier === "pro") return PRO_MONTHLY_LIMIT;
  if (tier === "team") return TEAM_MONTHLY_POOL;
  return null;
}

/**
 * Hard ceiling on monthly scans for paid tiers, expressed as a
 * multiplier of the soft cap. Above the soft cap we surface the
 * meter and email ops; above the hard cap we actually return 429
 * and stop scoring.
 *
 * Multiplier 2 means a Pro user shuts off at 4,000 scores/month
 * and Team at 50,000. The 2,000–4,000 / 25,000–50,000 zone is
 * deliberate — gives the user (and us) a wide warning band to
 * have a "let's talk about higher volume" conversation before
 * anything actually breaks.
 */
export const HARD_CAP_MULTIPLIER = 2;

export function monthlyHardCapForTier(tier: Tier): number | null {
  const soft = monthlyScoreCapForTier(tier);
  return soft === null ? null : soft * HARD_CAP_MULTIPLIER;
}
