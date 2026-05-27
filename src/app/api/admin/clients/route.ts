import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getAdminEmail } from "@/lib/admin";
import { isInternalOrg, orgMeta, orgStatus } from "@/lib/orgs";
import type { Tier } from "@/lib/plans";

/**
 * Admin client management (#190).
 *
 *   GET  /api/admin/clients   — list Team orgs + Pro users (read-only)
 *   POST /api/admin/clients   — provision a Team client: create a Clerk org
 *                               and invite the designated Team Lead as
 *                               org:admin. The acting admin is the org
 *                               creator and stays as a co-admin (per the
 *                               #190 decision; revisit later).
 *
 * Gated by getAdminEmail() — same pattern as /api/admin/comps.
 */

function unauthorized() {
  return NextResponse.json({ error: "Admin access required" }, { status: 403 });
}

type TeamClient = {
  id: string;
  name: string;
  membersCount: number;
  status: ReturnType<typeof orgStatus>;
  internal: boolean;
  teamLead: { firstName?: string; lastName?: string; email?: string } | null;
  createdAt: number;
};

type ProClient = {
  id: string;
  email: string;
  name: string | null;
  comp: boolean;
  since: number;
};

export async function GET() {
  if (!(await getAdminEmail())) return unauthorized();

  const client = await clerkClient();

  // Team clients = all Clerk organizations.
  const orgList = await client.organizations.getOrganizationList({
    limit: 200,
    includeMembersCount: true,
  });
  const teamClients: TeamClient[] = orgList.data.map((org) => {
    const meta = orgMeta(org);
    return {
      id: org.id,
      name: org.name,
      membersCount: org.membersCount ?? 0,
      status: orgStatus(org),
      internal: isInternalOrg(org),
      teamLead: meta.teamLead ?? null,
      createdAt: org.createdAt,
    };
  });

  // Pro clients = individual users with publicMetadata.tier === "pro".
  // NOTE: Clerk's getUserList can't filter by metadata server-side, so we
  // fetch and filter in memory. Fine at current scale; if the user base
  // grows large, back this with a Redis index of pro user ids.
  const userList = await client.users.getUserList({ limit: 500 });
  const proClients: ProClient[] = [];
  for (const u of userList.data) {
    const meta = u.publicMetadata as Record<string, unknown> | undefined;
    if ((meta?.tier as Tier | undefined) !== "pro") continue;
    proClients.push({
      id: u.id,
      email: u.primaryEmailAddress?.emailAddress ?? "",
      name: u.fullName || u.firstName || null,
      comp: meta?.comp === true,
      since:
        typeof meta?.compGrantedAt === "number"
          ? (meta.compGrantedAt as number)
          : u.createdAt,
    });
  }

  teamClients.sort((a, b) => b.createdAt - a.createdAt);
  proClients.sort((a, b) => b.since - a.since);

  return NextResponse.json({ teamClients, proClients });
}

export async function POST(req: NextRequest) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) return unauthorized();
  // getAdminEmail() guarantees a signed-in user, so userId is non-null.
  const { userId } = await auth();

  const body = await req.json().catch(() => ({}));
  const orgName = typeof body.orgName === "string" ? body.orgName.trim() : "";
  const leadFirstName =
    typeof body.leadFirstName === "string" ? body.leadFirstName.trim() : "";
  const leadLastName =
    typeof body.leadLastName === "string" ? body.leadLastName.trim() : "";
  const leadEmail =
    typeof body.leadEmail === "string"
      ? body.leadEmail.trim().toLowerCase()
      : "";

  if (!orgName) {
    return NextResponse.json(
      { error: "Organization name is required." },
      { status: 400 },
    );
  }
  if (!leadFirstName || !leadLastName) {
    return NextResponse.json(
      { error: "Team Lead first and last name are required." },
      { status: 400 },
    );
  }
  if (!leadEmail || !leadEmail.includes("@")) {
    return NextResponse.json(
      { error: "A valid Team Lead email is required." },
      { status: 400 },
    );
  }

  const client = await clerkClient();

  // 1) Create the org. The acting admin is createdBy (Clerk requires an
  //    existing user as the first org:admin) and stays as a co-admin.
  const org = await client.organizations.createOrganization({
    name: orgName,
    createdBy: userId!,
    publicMetadata: {
      status: "active",
      teamLead: {
        firstName: leadFirstName,
        lastName: leadLastName,
        email: leadEmail,
      },
      provisionedBy: adminEmail,
      provisionedAt: Date.now(),
    },
  });

  // 2) Invite the Team Lead as a second org:admin. On accept, the existing
  //    organizationMembership.created webhook grants them tier:team comp.
  const invitation = await client.organizations.createOrganizationInvitation({
    organizationId: org.id,
    inviterUserId: userId!,
    emailAddress: leadEmail,
    role: "org:admin",
  });

  return NextResponse.json({
    ok: true,
    orgId: org.id,
    invitationId: invitation.id,
  });
}
