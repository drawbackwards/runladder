/**
 * Current user's team summary — what /dashboard/team uses to render.
 *
 * GET → { team, membership, members[], invites[], billing, usage }
 *
 * Members and invites are visible to every team member. Sensitive admin-only
 * actions (invite, pause, archive, delete, promote) live on dedicated routes.
 */
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireTeamMember } from "@/lib/team-auth";
import {
  getBillingSummary,
  getTeamActivity,
  getTeamUsage,
  listInvites,
  listMembers,
  type Membership,
} from "@/lib/teams";

export const runtime = "nodejs";

type MemberWithUser = Membership & {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

async function hydrateMembers(members: Membership[]): Promise<MemberWithUser[]> {
  if (members.length === 0) return [];
  const client = await clerkClient();
  const ids = members.map((m) => m.userId);
  const list = await client.users.getUserList({
    userId: ids,
    limit: Math.max(ids.length, 1),
  });
  const byId = new Map(list.data.map((u) => [u.id, u] as const));
  return members.map((m) => {
    const u = byId.get(m.userId);
    return {
      ...m,
      email: u?.primaryEmailAddress?.emailAddress ?? null,
      firstName: u?.firstName ?? null,
      lastName: u?.lastName ?? null,
    };
  });
}

export async function GET() {
  const auth = await requireTeamMember();
  if (!auth.ok) return auth.response;

  const { team, membership } = auth;
  const isAdmin = membership.role === "admin";

  const [members, invites, billing, usage, activity] = await Promise.all([
    listMembers(team.id),
    isAdmin ? listInvites(team.id) : Promise.resolve([]),
    getBillingSummary(team.id),
    getTeamUsage(team.id),
    getTeamActivity(team.id, 50),
  ]);

  const hydrated = await hydrateMembers(members);
  const memberById = new Map(hydrated.map((m) => [m.userId, m] as const));

  // Annotate each activity event with the scorer's display name so the UI
  // doesn't need a separate Clerk lookup pass.
  const annotatedActivity = activity.map((ev) => {
    const m = memberById.get(ev.userId);
    return {
      ...ev,
      scorerName:
        m
          ? [m.firstName, m.lastName].filter(Boolean).join(" ").trim() ||
            m.email ||
            null
          : null,
    };
  });

  return NextResponse.json({
    team: {
      id: team.id,
      name: team.name,
      status: team.status,
      seatCap: team.seatCap,
      perOverageSeatPrice: team.perOverageSeatPrice,
      queryPool: team.queryPool,
      createdAt: team.createdAt,
    },
    membership,
    members: hydrated,
    invites: isAdmin ? invites : [],
    billing,
    usage,
    activity: annotatedActivity,
  });
}
