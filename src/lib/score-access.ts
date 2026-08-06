import { clerkClient } from "@clerk/nextjs/server";

type AuthContext = {
  userId: string;
  orgId: string | null | undefined;
  orgRole: string | null | undefined;
};

export type OwnerResolution =
  | { ok: true; ownerId: string; isTeamLeadView: boolean }
  | { ok: false; status: number; error: string };

/**
 * Resolve whose score history a request is allowed to read.
 *
 * A user always reads their own history. A Team Lead may read a member's via
 * `?member=<userId>` (#300) when they are `org:admin` and that member is in
 * their active org. Shared by the score-detail route and the thumbnail route
 * (#442) so their access rules can never diverge — a thumbnail must be exactly
 * as reachable as the score it belongs to, no more.
 */
export async function resolveScoreOwner(
  req: Request,
  { userId, orgId, orgRole }: AuthContext,
): Promise<OwnerResolution> {
  const memberParam = new URL(req.url).searchParams.get("member");
  const isTeamLeadView = !!memberParam && memberParam !== userId;
  if (!isTeamLeadView) {
    return { ok: true, ownerId: userId, isTeamLeadView: false };
  }
  if (!orgId) {
    return { ok: false, status: 404, error: "No active team" };
  }
  if (orgRole !== "org:admin") {
    return { ok: false, status: 403, error: "Team Lead access required" };
  }
  const client = await clerkClient();
  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 100,
  });
  const inOrg = memberships.data.some(
    (m) => m.publicUserData?.userId === memberParam,
  );
  if (!inOrg) {
    return { ok: false, status: 404, error: "Member not found in this team" };
  }
  return { ok: true, ownerId: memberParam as string, isTeamLeadView: true };
}
