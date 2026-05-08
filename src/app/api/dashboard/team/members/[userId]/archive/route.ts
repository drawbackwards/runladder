import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { archiveMember } from "@/lib/team-archives";

/**
 * Soft-archive a team member.
 *
 *   POST /api/dashboard/team/members/:userId/archive
 *
 * Soft removal: add userId to the org's archived set, then remove from
 * Clerk org so they lose access. Their score history stays under their
 * own user keys; the team rollup pulls archived members' historical
 * scores into insights and the heatmap, listed separately under
 * "Archived members."
 *
 * Auth: must be the active org's admin. The target must currently be a
 * member of the manager's active org (we don't reach into other orgs).
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
      { error: "Manager access required" },
      { status: 403 },
    );
  }

  const { userId: targetUserId } = await params;
  if (targetUserId === requesterId) {
    return NextResponse.json(
      { error: "You can't archive yourself." },
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
  if (!target) {
    return NextResponse.json(
      { error: "Member not found in this team" },
      { status: 404 },
    );
  }

  // Add to archive set first so a webhook race (membership.deleted ->
  // revokeComp) can't beat us to it.
  await archiveMember(orgId, targetUserId);

  await client.organizations.deleteOrganizationMembership({
    organizationId: orgId,
    userId: targetUserId,
  });

  return NextResponse.json({ ok: true });
}
