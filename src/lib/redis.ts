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
  - rate:anon:{ip}                     Integer counter with 24h TTL — per-IP anonymous cost backstop
  - anon:{anonId}:used                 Integer counter with 7d TTL — per-browser anonymous score cap
  - pending-score:{anonId}             JSON ScoreEntryInput with 7d TTL — anon result awaiting
                                       claim-on-signup (attached to the new account, then deleted)
*/

export function lifetimeScansKey(userId: string): string {
  return `user:${userId}:lifetime_scans_used`;
}

/** Per-browser anonymous score counter (keyed on the ladder_anon_id cookie). */
export function anonUsedKey(anonId: string): string {
  return `anon:${anonId}:used`;
}

/** Per-IP anonymous daily rate counter (cost backstop). */
export function anonIpRateKey(ip: string): string {
  return `rate:anon:${ip}`;
}

/** Anonymous score stashed for claim-on-signup, keyed on the ladder_anon_id cookie. */
export function pendingScoreKey(anonId: string): string {
  return `pending-score:${anonId}`;
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
