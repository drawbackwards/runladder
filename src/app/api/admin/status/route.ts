import { NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/admin";

/**
 * GET /api/admin/status → { admin: boolean }
 *
 * Lets client components (e.g. the Account menu) decide whether to show
 * admin-only navigation without exposing the ADMIN_EMAILS allowlist to the
 * browser. The allowlist stays server-side in src/lib/admin.ts.
 */
export async function GET() {
  const admin = !!(await getAdminEmail());
  return NextResponse.json({ admin });
}
