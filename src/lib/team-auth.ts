/**
 * Team auth helpers for /api/team/* routes.
 *
 * `requireTeamMember()` resolves the current Clerk user, looks up their
 * team membership, and returns either an OK result with team context or
 * an Err result with a ready-to-return NextResponse.
 *
 * `requireTeamAdmin()` is the same but additionally enforces
 * `membership.role === "admin"`.
 */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getMember, getTeam, getUserTeamId, type Membership, type Team } from "@/lib/teams";

export type TeamAuthOk = {
  ok: true;
  userId: string;
  team: Team;
  membership: Membership;
};

export type TeamAuthErr = {
  ok: false;
  response: NextResponse;
};

export async function requireTeamMember(): Promise<TeamAuthOk | TeamAuthErr> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sign in required" },
        { status: 401 },
      ),
    };
  }

  const teamId = await getUserTeamId(userId);
  if (!teamId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Not on a team" },
        { status: 404 },
      ),
    };
  }

  const team = await getTeam(teamId);
  const membership = await getMember(teamId, userId);
  if (!team || !membership) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Team or membership not found" },
        { status: 404 },
      ),
    };
  }

  if (membership.status === "archived") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Membership is archived" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, userId, team, membership };
}

export async function requireTeamAdmin(): Promise<TeamAuthOk | TeamAuthErr> {
  const result = await requireTeamMember();
  if (!result.ok) return result;

  if (result.membership.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Team admin role required" },
        { status: 403 },
      ),
    };
  }

  return result;
}
