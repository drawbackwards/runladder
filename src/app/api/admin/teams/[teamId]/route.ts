/**
 * Admin single-team detail and update.
 *
 * GET    → team metadata, members (with email), billing summary, monthly usage
 * PATCH  → update name, status, seatCap, perOverageSeatPrice, queryPool
 *
 * Gated by the runladder admin email allowlist (getAdminEmail).
 */
import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getAdminEmail } from "@/lib/admin";
import {
  getBillingSummary,
  getTeam,
  getTeamUsage,
  listMembers,
  updateTeam,
  type Membership,
  type TeamStatus,
} from "@/lib/teams";

export const runtime = "nodejs";

type MemberWithEmail = Membership & {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

async function hydrateMembers(
  members: Membership[],
): Promise<MemberWithEmail[]> {
  if (members.length === 0) return [];
  const client = await clerkClient();
  const ids = members.map((m) => m.userId);
  const users = await client.users.getUserList({
    userId: ids,
    limit: Math.max(ids.length, 1),
  });
  const byId = new Map(users.data.map((u) => [u.id, u] as const));
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

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ teamId: string }> },
) {
  const admin = await getAdminEmail();
  if (!admin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  const { teamId } = await ctx.params;
  const team = await getTeam(teamId);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const [members, billing, usage] = await Promise.all([
    listMembers(teamId),
    getBillingSummary(teamId),
    getTeamUsage(teamId),
  ]);

  const hydrated = await hydrateMembers(members);
  const ownerEmail = hydrated.find((m) => m.userId === team.ownerUserId)?.email ?? null;

  return NextResponse.json({
    team: {
      ...team,
      ownerEmail,
      billing,
      usage,
    },
    members: hydrated,
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ teamId: string }> },
) {
  const admin = await getAdminEmail();
  if (!admin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  const { teamId } = await ctx.params;
  const team = await getTeam(teamId);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  let body: {
    name?: string;
    status?: TeamStatus;
    seatCap?: number;
    perOverageSeatPrice?: number;
    queryPool?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Parameters<typeof updateTeam>[1] = {};
  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed || trimmed.length > 200) {
      return NextResponse.json(
        { error: "Team name must be 1–200 chars" },
        { status: 400 },
      );
    }
    patch.name = trimmed;
  }
  if (
    body.status === "active" ||
    body.status === "paused" ||
    body.status === "archived"
  ) {
    patch.status = body.status;
  }
  if (typeof body.seatCap === "number" && body.seatCap >= 0) {
    patch.seatCap = Math.floor(body.seatCap);
  }
  if (
    typeof body.perOverageSeatPrice === "number" &&
    body.perOverageSeatPrice >= 0
  ) {
    patch.perOverageSeatPrice = Math.floor(body.perOverageSeatPrice);
  }
  if (typeof body.queryPool === "number" && body.queryPool >= 0) {
    patch.queryPool = Math.floor(body.queryPool);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const next = await updateTeam(teamId, patch);
  if (!next) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({
    team: {
      ...next,
      billing: await getBillingSummary(teamId),
    },
  });
}
