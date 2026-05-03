import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getAdminEmail } from "@/lib/admin";
import { grantComp, revokeComp } from "@/lib/tier";
import type { Tier } from "@/lib/plans";

const PAID_TIERS: ReadonlyArray<Exclude<Tier, "free">> = ["pro", "team", "pulse"];

type CompUser = {
  userId: string;
  email: string;
  name: string | null;
  tier: Tier;
  reason: string;
  grantedAt: number;
  expiresAt?: number;
  expired: boolean;
};

function unauthorized() {
  return NextResponse.json({ error: "Admin access required" }, { status: 403 });
}

/**
 * GET /api/admin/comps
 * Lists all users currently on a complimentary plan (publicMetadata.comp === true).
 * Includes expired comps so admins can clean them up.
 */
export async function GET() {
  if (!(await getAdminEmail())) return unauthorized();

  const client = await clerkClient();
  // Clerk paginates; 500 covers our scale comfortably.
  const list = await client.users.getUserList({ limit: 500 });
  const now = Date.now();
  const comps: CompUser[] = [];
  for (const u of list.data) {
    const meta = u.publicMetadata as Record<string, unknown> | undefined;
    if (meta?.comp !== true) continue;
    const tierRaw = meta.tier;
    const tier: Tier =
      tierRaw === "pro" || tierRaw === "team" || tierRaw === "pulse"
        ? tierRaw
        : "free";
    const reason = typeof meta.compReason === "string" ? meta.compReason : "";
    const grantedAt =
      typeof meta.compGrantedAt === "number" ? meta.compGrantedAt : 0;
    const expiresAt =
      typeof meta.compExpiresAt === "number" ? meta.compExpiresAt : undefined;
    comps.push({
      userId: u.id,
      email: u.primaryEmailAddress?.emailAddress ?? "",
      name: u.fullName || u.firstName || null,
      tier,
      reason,
      grantedAt,
      expiresAt,
      expired: expiresAt != null && expiresAt < now,
    });
  }
  comps.sort((a, b) => b.grantedAt - a.grantedAt);
  return NextResponse.json({ comps });
}

/**
 * POST /api/admin/comps
 * Body: { email, tier, reason, expiresAt? }
 * Looks up the user by email, then grants a complimentary tier.
 * Returns 404 if no user exists for that email.
 */
export async function POST(req: NextRequest) {
  if (!(await getAdminEmail())) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const tier = body.tier as Tier | undefined;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const expiresAt =
    typeof body.expiresAt === "number" && Number.isFinite(body.expiresAt)
      ? body.expiresAt
      : undefined;

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (!tier || !PAID_TIERS.includes(tier as Exclude<Tier, "free">)) {
    return NextResponse.json(
      { error: "Tier must be pro, team, or pulse." },
      { status: 400 },
    );
  }
  if (!reason) {
    return NextResponse.json(
      { error: "Reason is required — capture context for future-you." },
      { status: 400 },
    );
  }
  if (expiresAt != null && expiresAt < Date.now()) {
    return NextResponse.json(
      { error: "Expiry is in the past." },
      { status: 400 },
    );
  }

  const client = await clerkClient();
  const list = await client.users.getUserList({ emailAddress: [email], limit: 1 });
  const user = list.data[0];
  if (!user) {
    return NextResponse.json(
      { error: `No Ladder account for ${email}. Have them sign up first.` },
      { status: 404 },
    );
  }

  await grantComp(user.id, {
    tier: tier as Exclude<Tier, "free">,
    reason,
    expiresAt,
  });
  return NextResponse.json({ ok: true, userId: user.id });
}

/**
 * DELETE /api/admin/comps
 * Body: { userId }
 * Resets the user to "free" and strips comp metadata. Does not touch Stripe.
 */
export async function DELETE(req: NextRequest) {
  if (!(await getAdminEmail())) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  await revokeComp(userId);
  return NextResponse.json({ ok: true });
}
