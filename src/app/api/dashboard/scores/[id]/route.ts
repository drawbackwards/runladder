import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // A Team Lead can open a score belonging to a member of their team from the
  // designer detail page (#300). When `?member=<userId>` is present and isn't
  // the requester, authorize exactly like the member-detail endpoint: the
  // requester must be org:admin and the member must be in their active org.
  const memberParam = new URL(req.url).searchParams.get("member");
  const isTeamLeadView = !!memberParam && memberParam !== userId;
  let ownerId = userId;

  if (isTeamLeadView) {
    if (!orgId) {
      return NextResponse.json({ error: "No active team" }, { status: 404 });
    }
    if (orgRole !== "org:admin") {
      return NextResponse.json(
        { error: "Team Lead access required" },
        { status: 403 }
      );
    }
    const client = await clerkClient();
    const memberships =
      await client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        limit: 100,
      });
    const inOrg = memberships.data.some(
      (m) => m.publicUserData?.userId === memberParam
    );
    if (!inOrg) {
      return NextResponse.json(
        { error: "Member not found in this team" },
        { status: 404 }
      );
    }
    ownerId = memberParam;
  }

  const scores = await redis.zrange(`user:${ownerId}:scores`, 0, -1, {
    rev: true,
  });

  for (const entry of scores as string[]) {
    try {
      const parsed = typeof entry === "string" ? JSON.parse(entry) : entry;
      if (parsed.id !== id) continue;
      // Soft-deleted scores are invisible to the owner, but a Team Lead keeps
      // the audit trail (mirrors the member-detail endpoint), so they may open
      // a deleted score's detail.
      if (parsed.deletedAt && !isTeamLeadView) {
        return NextResponse.json({ error: "Score not found" }, { status: 404 });
      }
      return NextResponse.json(parsed);
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "Score not found" }, { status: 404 });
}
