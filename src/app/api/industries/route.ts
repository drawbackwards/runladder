import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listIndustries } from "@/lib/industry-registry";

/**
 * User-facing industry list for the per-score tagging picker (#429).
 *
 *   GET /api/industries — base taxonomy + admin-added customs
 *
 * Any signed-in user can read the controlled taxonomy to tag their own scores.
 * Read-only on purpose: end users pick from existing industries and never add
 * to the shared list (adding stays admin-only via /api/admin/industries), so
 * the locked slug vocabulary the learning store depends on stays governed.
 * Anything bespoke goes in a free-form score tag instead.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  return NextResponse.json({ industries: await listIndustries() });
}
