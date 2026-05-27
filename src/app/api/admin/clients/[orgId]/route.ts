import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getAdminEmail } from "@/lib/admin";
import { isInternalOrg, orgMeta } from "@/lib/orgs";

/**
 * Org lifecycle management (#190).
 *
 *   PATCH  /api/admin/clients/:orgId   body { action }
 *     - "suspend" | "reactivate"      → toggle publicMetadata.status
 *     - "markInternal" | "unmarkInternal" → toggle publicMetadata.internal
 *   DELETE /api/admin/clients/:orgId   body { confirmName }
 *     - hard-deletes the org; confirmName must match the org name exactly.
 *
 * The internal (Drawbackwards) org can never be suspended or deleted.
 * Gated by getAdminEmail().
 */

function unauthorized() {
  return NextResponse.json({ error: "Admin access required" }, { status: 403 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) return unauthorized();

  const { orgId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({
    organizationId: orgId,
  });
  const internal = isInternalOrg(org);
  const existing = orgMeta(org);

  if (action === "suspend" || action === "reactivate") {
    if (internal) {
      return NextResponse.json(
        { error: "The internal Drawbackwards org cannot be suspended." },
        { status: 403 },
      );
    }
    const suspend = action === "suspend";
    const updated = await client.organizations.updateOrganization(orgId, {
      publicMetadata: {
        ...existing,
        status: suspend ? "suspended" : "active",
        suspendedAt: suspend ? Date.now() : undefined,
        suspendedBy: suspend ? adminEmail : undefined,
      },
    });
    return NextResponse.json({
      ok: true,
      status: (updated.publicMetadata as { status?: string })?.status ?? "active",
    });
  }

  if (action === "markInternal" || action === "unmarkInternal") {
    const updated = await client.organizations.updateOrganization(orgId, {
      publicMetadata: { ...existing, internal: action === "markInternal" },
    });
    return NextResponse.json({
      ok: true,
      internal: (updated.publicMetadata as { internal?: boolean })?.internal === true,
    });
  }

  return NextResponse.json(
    {
      error:
        "Unknown action. Expected suspend, reactivate, markInternal, or unmarkInternal.",
    },
    { status: 400 },
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  if (!(await getAdminEmail())) return unauthorized();
  // Confirm a signed-in admin (kept for parity / future per-actor auditing).
  await auth();

  const { orgId } = await params;
  const body = await req.json().catch(() => ({}));
  const confirmName = typeof body.confirmName === "string" ? body.confirmName : "";

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({
    organizationId: orgId,
  });

  if (isInternalOrg(org)) {
    return NextResponse.json(
      { error: "The internal Drawbackwards org cannot be deleted." },
      { status: 403 },
    );
  }

  if (confirmName.trim() !== org.name) {
    return NextResponse.json(
      { error: "Confirmation name does not match the organization name." },
      { status: 400 },
    );
  }

  // Deleting the org cascades organizationMembership.deleted webhooks, which
  // revoke each member's team comp (when they have no other org).
  await client.organizations.deleteOrganization(orgId);
  return NextResponse.json({ ok: true });
}
