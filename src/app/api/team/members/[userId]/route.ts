/**
 * Single-member ops — pause, archive, reactivate, promote, demote, remove.
 *
 * PATCH { status?, role? } → update membership
 * DELETE                   → remove the member from the team
 *
 * Admin-only. The team owner cannot be demoted, paused, archived, or removed
 * through this route — that prevents an admin from accidentally locking
 * everyone out. To replace an owner, the Ladder admin (Drawbackwards) must
 * create a new team or update the team record directly.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireTeamAdmin } from "@/lib/team-auth";
import {
  getMember,
  removeMember,
  setMemberRole,
  setMemberStatus,
  type MemberStatus,
  type TeamRole,
} from "@/lib/teams";
import { setUserSubscription } from "@/lib/tier";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> },
) {
  const auth = await requireTeamAdmin();
  if (!auth.ok) return auth.response;

  const { userId: targetUserId } = await ctx.params;
  const target = await getMember(auth.team.id, targetUserId);
  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  let body: { status?: MemberStatus; role?: TeamRole } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const isOwner = targetUserId === auth.team.ownerUserId;

  let next = target;

  if (body.status) {
    if (
      body.status !== "active" &&
      body.status !== "paused" &&
      body.status !== "archived"
    ) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (isOwner && body.status !== "active") {
      return NextResponse.json(
        { error: "The team owner must remain active. Replace the owner first." },
        { status: 400 },
      );
    }
    const updated = await setMemberStatus(auth.team.id, targetUserId, body.status);
    if (updated) next = updated;
    // Pausing or archiving means they no longer get team-tier access.
    if (body.status === "active") {
      await setUserSubscription(targetUserId, { tier: "team" });
    } else {
      await setUserSubscription(targetUserId, { tier: "free" });
    }
  }

  if (body.role) {
    if (body.role !== "admin" && body.role !== "member") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (isOwner && body.role !== "admin") {
      return NextResponse.json(
        { error: "The team owner cannot be demoted." },
        { status: 400 },
      );
    }
    const updated = await setMemberRole(auth.team.id, targetUserId, body.role);
    if (updated) next = updated;
  }

  return NextResponse.json({ membership: next });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ userId: string }> },
) {
  const auth = await requireTeamAdmin();
  if (!auth.ok) return auth.response;

  const { userId: targetUserId } = await ctx.params;
  const target = await getMember(auth.team.id, targetUserId);
  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (targetUserId === auth.team.ownerUserId) {
    return NextResponse.json(
      { error: "The team owner cannot be removed through this route." },
      { status: 400 },
    );
  }

  await removeMember(auth.team.id, targetUserId);
  // Drop their team-tier access. They stay a Ladder user at "free".
  await setUserSubscription(targetUserId, { tier: "free" });

  return NextResponse.json({ removed: true });
}
