import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail, pluginFetch } from "@/lib/admin";
import { CURRENT_API_VERSION } from "@/lib/app-version";

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

type UserRecord = {
  userId: string;
  email: string;
  tier: string;
  joinedAt: string | null;
  lastLoginAt: string | null;
  inviteCode: string | null;
  xp: number;
  usageThisMonth: number;
};

/**
 * Admin users — list, delete, reset invite.
 * Proxies the plugin backend's /api/auth/users. Clerk-admin-gated.
 */
export async function GET() {
  const admin = await getAdminEmail();
  if (!admin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403, headers: API_VERSION_HEADERS },
    );
  }

  const result = await pluginFetch<{ users: UserRecord[] }>(
    "/api/auth/users",
    { method: "GET" },
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: API_VERSION_HEADERS },
    );
  }

  return NextResponse.json(
    { users: result.data.users ?? [] },
    { headers: API_VERSION_HEADERS },
  );
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdminEmail();
  if (!admin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403, headers: API_VERSION_HEADERS },
    );
  }

  let body: { userId?: string } = {};
  try {
    body = await req.json();
  } catch {}

  if (!body.userId) {
    return NextResponse.json(
      { error: "userId required" },
      { status: 400, headers: API_VERSION_HEADERS },
    );
  }

  const result = await pluginFetch<{ ok: boolean }>("/api/auth/users", {
    method: "DELETE",
    body: { userId: body.userId },
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: API_VERSION_HEADERS },
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: API_VERSION_HEADERS },
  );
}

/** Reset — unclaims the user's invite code so they (or someone else) can reuse it. */
export async function POST(req: NextRequest) {
  const admin = await getAdminEmail();
  if (!admin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403, headers: API_VERSION_HEADERS },
    );
  }

  let body: { userId?: string; action?: string } = {};
  try {
    body = await req.json();
  } catch {}

  if (!body.userId) {
    return NextResponse.json(
      { error: "userId required" },
      { status: 400, headers: API_VERSION_HEADERS },
    );
  }

  const action = body.action ?? "reset";
  if (action !== "reset") {
    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400, headers: API_VERSION_HEADERS },
    );
  }

  const result = await pluginFetch<{ ok: boolean }>("/api/auth/users", {
    method: "POST",
    body: { userId: body.userId, action: "reset" },
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: API_VERSION_HEADERS },
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: API_VERSION_HEADERS },
  );
}
