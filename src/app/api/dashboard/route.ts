import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis, lifetimeScansKey } from "@/lib/redis";
import { FREE_LIFETIME_LIMIT, isPaidTier } from "@/lib/plans";
import { getUserSubscription } from "@/lib/tier";
import { getUserStats } from "@/lib/scores";
import { getMember, getTeam, getUserTeamId } from "@/lib/teams";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [scores, used, sub, stats, teamId] = await Promise.all([
    redis.zrange(`user:${userId}:scores`, 0, -1, { rev: true }),
    redis.get<number>(lifetimeScansKey(userId)),
    getUserSubscription(userId),
    getUserStats(userId),
    getUserTeamId(userId),
  ]);

  // If on a team, resolve the team name + role so the dashboard banner can
  // show "Member of [Team]" instead of the generic paid banner.
  let team: { id: string; name: string; role: "admin" | "member" } | null = null;
  if (teamId) {
    const [t, membership] = await Promise.all([
      getTeam(teamId),
      getMember(teamId, userId),
    ]);
    if (t && membership && membership.status !== "archived") {
      team = { id: t.id, name: t.name, role: membership.role };
    }
  }

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
    team,
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
