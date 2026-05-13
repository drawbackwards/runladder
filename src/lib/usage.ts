/**
 * Usage helpers — single source of truth for "how many scores has
 * this user (or team) burned this month" reads.
 *
 * Writes happen inside persistScoreEntry (src/lib/scores.ts) where the
 * lifetime counter has always lived; this module just reads. Keeping
 * reads centralized means the /api/usage/me endpoint, the
 * /dashboard/team aggregation, and any future admin view share the
 * same number — no per-call-site arithmetic drift.
 */
import { redis, lifetimeScansKey, monthlyScansKey, currentYearMonth } from "@/lib/redis";

/**
 * Days remaining in the current UTC month, inclusive of today.
 * Used by the dashboard usage meter to display "resets in N days"
 * without exposing the underlying TTL math.
 */
export function daysUntilMonthEnd(date: Date = new Date()): number {
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
  );
  const diff = end.getTime() - date.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Per-user current-month scan count. Returns 0 if the counter hasn't been touched. */
export async function getMonthlyScans(
  userId: string,
  yyyymm: string = currentYearMonth(),
): Promise<number> {
  const v = await redis.get<number>(monthlyScansKey(userId, yyyymm));
  return v ?? 0;
}

/** Per-user lifetime scan count. Drives the free-tier cap. */
export async function getLifetimeScans(userId: string): Promise<number> {
  const v = await redis.get<number>(lifetimeScansKey(userId));
  return v ?? 0;
}

/**
 * Sum of this month's scan counts across a set of user IDs. Used by
 * /dashboard/team to roll up the team-pool meter from each member's
 * individual counter. Issues all reads in parallel — at typical team
 * sizes (≤ 100 members) one Promise.all round-trip is fine.
 */
export async function getTeamMonthlyTotal(
  userIds: string[],
  yyyymm: string = currentYearMonth(),
): Promise<number> {
  if (userIds.length === 0) return 0;
  const counts = await Promise.all(userIds.map((id) => getMonthlyScans(id, yyyymm)));
  return counts.reduce((sum, n) => sum + n, 0);
}

/**
 * Per-member breakdown for the same set of userIds. Returns an object
 * map for easy JSON serialization. Used by the /dashboard/team Usage
 * column and stacked pool bar.
 */
export async function getTeamMonthlyByUser(
  userIds: string[],
  yyyymm: string = currentYearMonth(),
): Promise<Record<string, number>> {
  if (userIds.length === 0) return {};
  const counts = await Promise.all(userIds.map((id) => getMonthlyScans(id, yyyymm)));
  const out: Record<string, number> = {};
  userIds.forEach((id, i) => {
    out[id] = counts[i];
  });
  return out;
}
