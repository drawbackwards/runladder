import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * Promote a designer to Team Lead.
 *
 *   POST /api/dashboard/team/members/:userId/promote
 *
 * Flips the target's org membership role from org:member to org:admin.
 * Multiple Team Leads per org are allowed. This does NOT change the org's
 * publicMetadata.teamLead — that stays the provisioning-time primary
 * contact used for pool-cap alert emails (#402, #423).
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
      { error: "Team Lead access required" },
      { status: 403 },
    );
  }

  const { userId: targetUserId } = await params;
  if (targetUserId === requesterId) {
    return NextResponse.json(
      { error: "You're already a Team Lead." },
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
  if (target.role === "org:admin") {
    return NextResponse.json(
      { error: "They're already a Team Lead." },
      { status: 400 },
    );
  }

  await client.organizations.updateOrganizationMembership({
    organizationId: orgId,
    userId: targetUserId,
    role: "org:admin",
  });

  return NextResponse.json({ ok: true });
}
