import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/*
  Redis key schema:
  - votes:{slug}                       Hash { total: float, count: int }
  - user:{userId}:scores               Sorted set (timestamp as score, JSON payload as member)
  - user:{userId}:lifetime_scans_used  Integer counter, never resets — drives the free-tier cap
  - user:{userId}:scans:{yyyy-mm}      Integer counter with ~40-day TTL — drives the Pro/Team
                                       usage meter and the team-pool aggregation in
                                       /dashboard/team. Increments alongside the lifetime
                                       counter inside persistScoreEntry.
  - rate:anon:{ip}                     Integer counter with 24h TTL for anonymous rate limiting
*/

export function lifetimeScansKey(userId: string): string {
  return `user:${userId}:lifetime_scans_used`;
}

/**
 * Year-month bucket key for the per-user monthly scan counter.
 * `yyyymm` should be the format produced by `currentYearMonth()`
 * ("2026-05"). Keeping the format ISO-flavored makes manual Redis
 * inspection readable and lets us sort by string when listing
 * recent months for an admin view.
 */
export function monthlyScansKey(userId: string, yyyymm: string): string {
  return `user:${userId}:scans:${yyyymm}`;
}

/** Current "YYYY-MM" string in UTC. Single helper so every caller uses the same boundary. */
export function currentYearMonth(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
