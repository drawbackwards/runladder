import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/admin";
import { emailSample, EMAIL_SAMPLE_TYPES } from "@/lib/email";

/**
 * Admin email preview (#402) — render any system email in the browser to
 * iterate on the look with no sending.
 *
 *   GET /api/admin/email-preview?type=pool-lead-80
 *
 * With no (or an unknown) type, returns a small index of the available types.
 * Gated by getAdminEmail().
 */
export async function GET(req: NextRequest) {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "";
  const sample = emailSample(type);

  if (!sample) {
    const links = EMAIL_SAMPLE_TYPES.map(
      (t) => `<li><a href="/api/admin/email-preview?type=${t}">${t}</a></li>`,
    ).join("");
    return new NextResponse(
      `<!doctype html><meta charset="utf-8"><title>Email preview</title><body style="font-family:sans-serif;padding:24px;"><h1>Email preview</h1><p>Add <code>?type=</code>:</p><ul>${links}</ul></body>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  return new NextResponse(sample.html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
