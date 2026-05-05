/**
 * Revoke a pending invite. Admin-only.
 *
 * DELETE → remove the invite from the team and invalidate the token.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireTeamAdmin } from "@/lib/team-auth";
import { deleteInvite, getInviteByToken } from "@/lib/teams";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const auth = await requireTeamAdmin();
  if (!auth.ok) return auth.response;

  const { token } = await ctx.params;
  const invite = await getInviteByToken(token);
  if (!invite || invite.teamId !== auth.team.id) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  await deleteInvite(auth.team.id, token);
  return NextResponse.json({ revoked: true });
}
