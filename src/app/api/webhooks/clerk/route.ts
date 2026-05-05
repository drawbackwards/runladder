import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { clerkClient } from "@clerk/nextjs/server";
import { grantComp, revokeComp } from "@/lib/tier";

/**
 * Clerk webhook handler — drives team-tier comping off Clerk Org events.
 *
 * Configure in Clerk Dashboard → Webhooks → Add endpoint:
 *   URL: https://runladder.com/api/webhooks/clerk
 *   Events: organizationMembership.created, organizationMembership.deleted
 *   Signing secret → CLERK_WEBHOOK_SECRET (Vercel env)
 *
 * On organizationMembership.created we grant tier "team" with a reason
 * that names the org. On deletion we revoke only if the user is no longer
 * in any organization (so leaving one team doesn't drop tier when the
 * user still belongs to another).
 */

type ClerkOrgMembershipEvent = {
  type: string;
  data: {
    public_user_data?: {
      user_id?: string;
    };
    organization?: {
      id?: string;
      name?: string;
    };
  };
};

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 },
    );
  }

  const body = await req.text();
  const wh = new Webhook(secret);

  let event: ClerkOrgMembershipEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkOrgMembershipEvent;
  } catch {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 },
    );
  }

  const userId = event.data.public_user_data?.user_id;
  const orgName = event.data.organization?.name;

  if (!userId) {
    return NextResponse.json({ ok: true, skipped: "no userId" });
  }

  if (event.type === "organizationMembership.created") {
    await grantComp(userId, {
      tier: "team",
      reason: orgName ? `Member of ${orgName}` : "Team member",
    });
    return NextResponse.json({ ok: true, action: "granted" });
  }

  if (event.type === "organizationMembership.deleted") {
    const client = await clerkClient();
    const remaining = await client.users.getOrganizationMembershipList({
      userId,
    });
    if (remaining.totalCount === 0) {
      await revokeComp(userId);
      return NextResponse.json({ ok: true, action: "revoked" });
    }
    return NextResponse.json({ ok: true, action: "kept", reason: "in other org" });
  }

  return NextResponse.json({ ok: true, skipped: event.type });
}
