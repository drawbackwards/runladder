import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * Reinvite a pending invitation.
 *
 *   POST /api/dashboard/team/invitations/:id/reinvite
 *
 * Auth: must be the active org's admin. We revoke the original invitation
 * (so the email becomes invite-able again) and immediately create a fresh
 * one to the same address with the same role. Useful when the original
 * invite expired or got buried in the invitee's inbox.
 *
 * Returns the new invitation id so the client can refresh its list.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, orgId, orgRole } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "No active team" }, { status: 404 });
  }
  if (orgRole !== "org:admin") {
    return NextResponse.json(
      { error: "Manager access required" },
      { status: 403 },
    );
  }

  const { id: invitationId } = await params;
  const client = await clerkClient();

  // Find the invitation in the active org. Use the org's invitation list
  // rather than a direct lookup so we don't accidentally reinvite an
  // invitation from a different org.
  const list = await client.organizations.getOrganizationInvitationList({
    organizationId: orgId,
  });
  const target = list.data.find((inv) => inv.id === invitationId);
  if (!target) {
    return NextResponse.json(
      { error: "Invitation not found in this team" },
      { status: 404 },
    );
  }

  const emailAddress = target.emailAddress;
  const role = target.role || "org:member";

  if (target.status === "pending") {
    try {
      await client.organizations.revokeOrganizationInvitation({
        organizationId: orgId,
        invitationId,
        requestingUserId: userId,
      });
    } catch (e) {
      console.error("[reinvite] revoke failed", e);
      // Continue anyway — if revoke fails because the original is already
      // expired/revoked, creating a new one is still the right move.
    }
  }

  const fresh = await client.organizations.createOrganizationInvitation({
    organizationId: orgId,
    inviterUserId: userId,
    emailAddress,
    role,
  });

  return NextResponse.json({ ok: true, invitation: { id: fresh.id } });
}
