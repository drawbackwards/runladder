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
  company?: string | null;
  role?: string | null;
};

/**
 * Admin users — list, detail, patch, delete, reset invite.
 *
 * GET                    → list all users (summary)
 * GET ?userId=X          → single-user detail bundle (user + activity + errors)
 * GET ?userId=X&view=activity → just that user's activity
 * GET ?userId=X&view=errors   → just that user's errors
 * PATCH { userId, fields }    → edit whitelisted CRM fields
 * DELETE { userId }           → hard-delete + unclaim invite
 * POST { userId, action:"reset" } → unclaim invite without deleting
 *
 * All gated by Clerk admin email allowlist (getAdminEmail).
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminEmail();
  if (!admin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403, headers: API_VERSION_HEADERS },
    );
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const view = url.searchParams.get("view");

  if (userId) {
    const search: Record<string, string> = { userId };
    if (view) search.view = view;
    const result = await pluginFetch<unknown>("/api/auth/users", {
      method: "GET",
      search,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status, headers: API_VERSION_HEADERS },
      );
    }
    return NextResponse.json(result.data, { headers: API_VERSION_HEADERS });
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

export async function PATCH(req: NextRequest) {
  const admin = await getAdminEmail();
  if (!admin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403, headers: API_VERSION_HEADERS },
    );
  }

  let body: { userId?: string; fields?: Record<string, string | null> } = {};
  try {
    body = await req.json();
  } catch {}

  if (!body.userId || !body.fields) {
    return NextResponse.json(
      { error: "userId and fields required" },
      { status: 400, headers: API_VERSION_HEADERS },
    );
  }

  const result = await pluginFetch<{ user: UserRecord }>("/api/auth/users", {
    method: "PATCH",
    body: { userId: body.userId, fields: body.fields },
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: API_VERSION_HEADERS },
    );
  }

  return NextResponse.json(result.data, { headers: API_VERSION_HEADERS });
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
