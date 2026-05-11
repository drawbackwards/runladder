/**
 * Lightweight identity endpoint — returns the signed-in user's tier and
 * team membership (if any). Used by surfaces that need to gate UI on tier
 * but don't need the full /api/dashboard payload (scores, stats, etc).
 *
 * Returns 200 in every case. For anonymous callers, returns
 * `{ signedIn: false, tier: "free", paid: false, team: null }`.
 */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isPaidTier } from "@/lib/plans";
import { getUserSubscription } from "@/lib/tier";
import { getMember, getTeam, getUserTeamId } from "@/lib/teams";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({
      signedIn: false,
      tier: "free" as const,
      paid: false,
      team: null,
    });
  }

  const [sub, teamId] = await Promise.all([
    getUserSubscription(userId),
    getUserTeamId(userId),
  ]);

  let team: {
    id: string;
    name: string;
    role: "admin" | "member";
  } | null = null;
  if (teamId) {
    const [t, membership] = await Promise.all([
      getTeam(teamId),
      getMember(teamId, userId),
    ]);
    if (t && membership && membership.status !== "archived") {
      team = { id: t.id, name: t.name, role: membership.role };
    }
  }

  return NextResponse.json({
    signedIn: true,
    tier: sub.tier,
    paid: isPaidTier(sub.tier),
    team,
  });
}
