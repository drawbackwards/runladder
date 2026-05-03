/**
 * Plan limits and tier definitions — single source of truth.
 * Keep in sync with the /pricing page and /framework copy.
 */

export type Tier = "free" | "pro" | "team" | "pulse";

/** Free-tier lifetime score quota. Shared across all surfaces (web, Skill, Figma, MCP, API). */
export const FREE_LIFETIME_LIMIT = 5;

/** Anonymous (unauthenticated) rate limit, per IP, per 24 hours. */
export const ANON_LIMIT = 1;

/** Tiers that bypass the free lifetime cap. */
const PAID_TIERS: ReadonlySet<Tier> = new Set(["pro", "team", "pulse"]);

export function isPaidTier(tier: Tier): boolean {
  return PAID_TIERS.has(tier);
}
