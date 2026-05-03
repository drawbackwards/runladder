import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getAdminEmail } from "@/lib/admin";
import { grantComp, revokeComp } from "@/lib/tier";
import {
  setPendingComp,
  listPendingComps,
  deletePendingComp,
} from "@/lib/pending-comps";
import type { Tier } from "@/lib/plans";

const PAID_TIERS: ReadonlyArray<Exclude<Tier, "free">> = ["pro", "team", "pulse"];

type CompRow = {
  /** "active" = on a real Clerk user; "pending" = email-only, will activate on signup. */
  status: "active" | "pending";
  userId: string | null;
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
 * Lists all comps:
 *  - Active: users with publicMetadata.comp === true
 *  - Pending: comps issued for emails that haven't signed up yet
 */
export async function GET() {
  if (!(await getAdminEmail())) return unauthorized();

  const client = await clerkClient();
  const [list, pending] = await Promise.all([
    client.users.getUserList({ limit: 500 }),
    listPendingComps().catch(() => []),
  ]);
  const now = Date.now();
  const rows: CompRow[] = [];

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
    rows.push({
      status: "active",
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

  for (const p of pending) {
    rows.push({
      status: "pending",
      userId: null,
      email: p.email,
      name: null,
      tier: p.tier,
      reason: p.reason,
      grantedAt: p.grantedAt,
      expiresAt: p.expiresAt,
      expired: p.expiresAt != null && p.expiresAt < now,
    });
  }

  rows.sort((a, b) => b.grantedAt - a.grantedAt);
  return NextResponse.json({ comps: rows });
}

/**
 * POST /api/admin/comps
 * Body: { email, tier, reason, expiresAt? }
 *
 * - If a Ladder account exists for the email, grants the comp on Clerk
 *   publicMetadata immediately. Returns { ok: true, status: "active" }.
 * - If no account exists, creates a pending comp keyed by email. The comp
 *   is automatically applied on the user's first signed-in action.
 *   Returns { ok: true, status: "pending" }.
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

  if (user) {
    await grantComp(user.id, {
      tier: tier as Exclude<Tier, "free">,
      reason,
      expiresAt,
    });
    return NextResponse.json({
      ok: true,
      status: "active",
      userId: user.id,
    });
  }

  // No Ladder account yet — store a pending comp. Will auto-apply on signup.
  await setPendingComp({
    email,
    tier: tier as Exclude<Tier, "free">,
    reason,
    grantedAt: Date.now(),
    expiresAt,
  });
  return NextResponse.json({ ok: true, status: "pending" });
}

/**
 * DELETE /api/admin/comps
 * Body: { userId } for active comps, or { email } for pending comps.
 */
export async function DELETE(req: NextRequest) {
  if (!(await getAdminEmail())) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (userId) {
    await revokeComp(userId);
    return NextResponse.json({ ok: true });
  }
  if (email) {
    await deletePendingComp(email);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json(
    { error: "userId or email is required." },
    { status: 400 },
  );
}
