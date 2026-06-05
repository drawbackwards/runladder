import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { unarchiveMember, isArchived } from "@/lib/team-archives";

/**
 * Hard-delete a team member's link to this org.
 *
 *   POST /api/dashboard/team/members/:userId/delete
 *
 * Removes them from the Clerk org AND scrubs them from the archive set
 * if present. After this they have no association with the team — their
 * historical work no longer feeds team insights.
 *
 * The user's personal Clerk account and personal score history are not
 * touched. Delete here means "remove from the team," not "delete the
 * person." If a manager wants to delete the actual user account, that
 * has to happen from Clerk dashboard or a separate admin path.
 *
 * Auth: must be the active org's admin. Target can be a current member
 * OR an archived ex-member of this org.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: requesterId, orgId, orgRole } = await auth();
  if (!requesterId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "No active team" }, { status: 404 });
  }
  if (orgRole !== "org:admin") {
    return NextResponse.json(
      { error: "Team Lead access required" },
      { status: 403 },
    );
  }

  const { userId: targetUserId } = await params;
  if (targetUserId === requesterId) {
    return NextResponse.json(
      { error: "You can't delete yourself." },
      { status: 400 },
    );
  }

  const client = await clerkClient();
  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 100,
  });
  const target = memberships.data.find(
    (m) => m.publicUserData?.userId === targetUserId,
  );
  const archived = await isArchived(orgId, targetUserId);

  if (!target && !archived) {
    return NextResponse.json(
      { error: "Member not found in this team" },
      { status: 404 },
    );
  }

  // Always clear the archive flag — for active members it's a no-op, for
  // archived members it ensures they fully drop out of team rollups.
  await unarchiveMember(orgId, targetUserId);

  // Only call Clerk if they're still in the org (archived members are
  // already removed from Clerk).
  if (target) {
    await client.organizations.deleteOrganizationMembership({
      organizationId: orgId,
      userId: targetUserId,
    });
  }

  return NextResponse.json({ ok: true });
}
