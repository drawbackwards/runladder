import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/admin";
import { addIndustry, listIndustries } from "@/lib/industry-registry";

/**
 * Industry registry (#422).
 *
 *   GET  /api/admin/industries          — base list + custom additions
 *   POST /api/admin/industries          body { label } — add a custom industry
 *
 * Add-only by design: no rename/delete endpoints. Slugs are stamped into
 * de-identified learning records and must stay stable forever; see
 * src/lib/industry-registry.ts for the guardrails.
 *
 * Gated by getAdminEmail().
 */

function unauthorized() {
  return NextResponse.json({ error: "Admin access required" }, { status: 403 });
}

export async function GET() {
  if (!(await getAdminEmail())) return unauthorized();
  return NextResponse.json({ industries: await listIndustries() });
}

export async function POST(req: NextRequest) {
  if (!(await getAdminEmail())) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label : "";
  const result = await addIndustry(label);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, option: result.option });
}
