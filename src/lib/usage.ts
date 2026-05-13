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
import { monthlyScoreCapForTier, PRO_MONTHLY_LIMIT } from "@/lib/plans";
import { getUserSubscription } from "@/lib/tier";
import { clerkClient } from "@clerk/nextjs/server";

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

/**
 * Pre-threshold for the alert pipeline. The lowest paid cap is Pro's
 * monthly limit, so any monthly count at or below that can't be an
 * over-cap event for any tier. Hoisting this here keeps the check
 * inside persistScoreEntry trivially cheap — one integer compare,
 * no Clerk / Redis lookups, no work for the 99% of users who never
 * approach it.
 */
export const ANY_TIER_CAP_THRESHOLD = PRO_MONTHLY_LIMIT;

/**
 * Sends a one-time email alert to hello@drawbackwards.com when a paid
 * user crosses their tier's monthly soft cap for the first time in
 * the current month.
 *
 * Resolves tier + user email internally so the call site doesn't have
 * to wire them through. Designed for fire-and-forget: callers should
 * `.catch(() => {})` and not await. The function self-contains all
 * errors — failure to send never propagates back to the scoring path.
 *
 * Idempotent via a Redis flag (`user:{id}:cap_alert:{yyyy-mm}`) set
 * with SET NX, so concurrent score writes from the same user can't
 * fan out duplicate emails. Flag TTL matches the monthly counter's
 * (~40 days) so flags age out with the data they track.
 *
 * No-ops when:
 *   - tier has no monthly cap (free, pulse)
 *   - newCount hasn't actually crossed the user's tier cap
 *   - alert flag for this month is already set
 *   - RESEND_API_KEY is not configured (falls back to console.log so
 *     the event still appears in Vercel runtime logs for ops review)
 */
export async function maybeAlertCapCrossed(
  userId: string,
  newMonthlyCount: number,
): Promise<void> {
  // Cheap early-out before any external lookups. Pro is the lowest
  // paid cap; anything at or under it definitionally isn't a crossing.
  if (newMonthlyCount <= ANY_TIER_CAP_THRESHOLD) return;

  const sub = await getUserSubscription(userId);
  const tier = sub.tier;
  const cap = monthlyScoreCapForTier(tier);
  if (cap === null) return;
  if (newMonthlyCount <= cap) return;

  const yyyymm = currentYearMonth();
  const flagKey = `user:${userId}:cap_alert:${yyyymm}`;
  // SET NX returns null when the key already exists.
  const claimed = await redis.set(flagKey, "1", { nx: true, ex: 60 * 60 * 24 * 40 });
  if (claimed === null) return; // already alerted for this user this month

  // Look up email via Clerk for the alert body. Best-effort — if Clerk
  // is unreachable we still send with userId.
  let userEmail: string | null = null;
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    userEmail = user.primaryEmailAddress?.emailAddress ?? null;
  } catch {
    // Non-fatal — proceed without email.
  }

  const subject = `[Ladder] ${tier} user crossed monthly cap (${newMonthlyCount} / ${cap})`;
  const dashboardLink = `https://runladder.com/admin/users/${userId}`;
  const replyLink = userEmail
    ? `mailto:${userEmail}?subject=Higher-volume%20Ladder%20conversation`
    : null;
  const body = [
    `User: ${userEmail ?? "(no email on file, id " + userId + ")"}`,
    `Tier: ${tier}`,
    `Scores this month: ${newMonthlyCount}`,
    `Soft cap: ${cap}`,
    `Overage: ${newMonthlyCount - cap}`,
    "",
    `Admin: ${dashboardLink}`,
    replyLink ? `Reach out: ${replyLink}` : null,
    "",
    "This is a one-time alert per user per month. The user is still",
    "scoring (no hard block). If you want to start a conversation",
    "about higher-volume pricing, reply directly.",
  ]
    .filter(Boolean)
    .join("\n");

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("[LADDER:CAP-ALERT]", subject, "—", body.replace(/\n/g, " | "));
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Ladder <alerts@runladder.com>",
        to: ["hello@drawbackwards.com"],
        subject,
        text: body,
      }),
    });
  } catch (err) {
    console.error("[LADDER:CAP-ALERT] send failed:", err);
    // Note: we don't unset the flag — better to under-alert than spam
    // on transient send failures. Next month we'll alert fresh.
  }
}
