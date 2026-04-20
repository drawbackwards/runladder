import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail, pluginFetch } from "@/lib/admin";
import { CURRENT_API_VERSION } from "@/lib/app-version";

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

type InviteRecord = {
  code: string;
  tier: string;
  email: string | null;
  claimed: boolean;
  claimedBy: string | null;
  claimedAt?: string | null;
  createdAt: string;
};

/**
 * Admin invite codes — list + generate.
 * Proxies the plugin backend's /api/auth/invite with the server-side admin
 * key attached. Browser never sees the key; it authenticates via Clerk +
 * admin-email allowlist (see getAdminEmail).
 */
export async function GET() {
  const admin = await getAdminEmail();
  if (!admin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403, headers: API_VERSION_HEADERS },
    );
  }

  const result = await pluginFetch<{ codes: InviteRecord[] }>(
    "/api/auth/invite",
    { method: "GET" },
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: API_VERSION_HEADERS },
    );
  }

  return NextResponse.json(
    { codes: result.data.codes ?? [] },
    { headers: API_VERSION_HEADERS },
  );
}

export async function POST(req: NextRequest) {
  const admin = await getAdminEmail();
  if (!admin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403, headers: API_VERSION_HEADERS },
    );
  }

  let body: { count?: number; tier?: string } = {};
  try {
    body = await req.json();
  } catch {
    // allow empty body — defaults below
  }

  const count = Math.min(Math.max(1, Number(body.count) || 1), 50);
  const tier = typeof body.tier === "string" ? body.tier : "beta";

  const result = await pluginFetch<{ codes: string[] }>("/api/auth/invite", {
    method: "POST",
    body: { count, tier },
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: API_VERSION_HEADERS },
    );
  }

  return NextResponse.json(
    { codes: result.data.codes ?? [] },
    { headers: API_VERSION_HEADERS },
  );
}
