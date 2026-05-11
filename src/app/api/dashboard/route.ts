import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redis, lifetimeScansKey } from "@/lib/redis";
import { FREE_LIFETIME_LIMIT, isPaidTier } from "@/lib/plans";
import { getUserSubscription, grantComp } from "@/lib/tier";
import { getUserStats } from "@/lib/scores";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Self-healing fallback: if the user belongs to any Clerk organization
  // but doesn't yet have a team-tier comp (the webhook missed, the user
  // pre-dates the webhook, or the secret is unconfigured), grant the comp
  // here so the dashboard banner doesn't lie to them. Idempotent.
  try {
    const client = await clerkClient();
    const sub = await getUserSubscription(userId);
    if (sub.tier === "free" || (sub.tier !== "team" && !sub.comp)) {
      const memberships = await client.users.getOrganizationMembershipList({
        userId,
      });
      const firstOrg = memberships.data[0];
      if (firstOrg) {
        await grantComp(userId, {
          tier: "team",
          reason: firstOrg.organization?.name
            ? `Member of ${firstOrg.organization.name}`
            : "Team member",
        });
      }
    }
  } catch {
    // Fallback is best-effort. If Clerk read fails, fall through to the
    // normal subscription read below — the user still gets correct data
    // if their tier was already set.
  }

  const [scores, used, sub, stats] = await Promise.all([
    redis.zrange(`user:${userId}:scores`, 0, -1, { rev: true }),
    redis.get<number>(lifetimeScansKey(userId)),
    getUserSubscription(userId),
    getUserStats(userId),
  ]);

  const parsedScores = (scores as string[]).map((entry) => {
    if (typeof entry === "string") {
      try {
        return JSON.parse(entry);
      } catch {
        return null;
      }
    }
    return entry;
  }).filter(Boolean);

  return NextResponse.json({
    scores: parsedScores,
    stats,
    tier: sub.tier,
    paid: isPaidTier(sub.tier),
    comp: sub.comp
      ? {
          reason: sub.comp.reason,
          expiresAt: sub.comp.expiresAt ?? null,
        }
      : null,
    usage: {
      used: used ?? 0,
      limit: FREE_LIFETIME_LIMIT,
      lifetime: true,
    },
  });
}
