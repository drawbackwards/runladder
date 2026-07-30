import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/admin";
import { emailSample, sendEmail, EMAIL_SAMPLE_TYPES } from "@/lib/email";

/**
 * Admin test-send (#402) — fire a sample system email to a chosen inbox so we
 * can see how it renders in a real client (Gmail mangles HTML differently than
 * a browser).
 *
 *   POST /api/admin/email-test   body { type, to }
 *
 * Requires RESEND_API_KEY to actually deliver; otherwise sendEmail logs and
 * this still returns ok (the log is visible in Vercel runtime logs). Gated by
 * getAdminEmail().
 */
export async function POST(req: NextRequest) {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { type?: string; to?: string };
  const type = typeof body.type === "string" ? body.type : "";
  // Default to the acting admin's own email so a mistyped recipient can't send
  // a client-looking email to an outsider.
  const to = typeof body.to === "string" && body.to.includes("@") ? body.to : adminEmail;

  const sample = emailSample(type);
  if (!sample) {
    return NextResponse.json(
      { error: `Unknown type. Expected one of: ${EMAIL_SAMPLE_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  await sendEmail({ to, subject: `[TEST] ${sample.subject}`, html: sample.html });
  return NextResponse.json({ ok: true, sent: { type, to } });
}
