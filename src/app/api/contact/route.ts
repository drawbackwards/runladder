import { NextRequest, NextResponse } from "next/server";

/* ── Rate limiting ── */
const rateMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + 3600000 });
    return false;
  }
  entry.count++;
  return entry.count > 5; // 5 submissions per hour
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, company, interest, message } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.length > 200) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.includes("@") || email.length > 200) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!message || typeof message !== "string" || message.length > 5000) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const safeCompany = typeof company === "string" ? company.slice(0, 200) : "";
    const safeInterest = typeof interest === "string" ? interest.slice(0, 200) : "";

    // Send via Resend if API key is configured
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Ladder <contact@runladder.com>",
          to: ["ward@drawbackwards.com"],
          subject: `[Ladder] ${safeInterest || "New inquiry"} from ${name}`,
          text: [
            `Name: ${name}`,
            `Email: ${email}`,
            safeCompany ? `Company: ${safeCompany}` : null,
            safeInterest ? `Interest: ${safeInterest}` : null,
            "",
            "Message:",
            message,
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });
    } else {
      // Fallback: log to console (visible in Vercel runtime logs)
      console.log("[LADDER:CONTACT]", JSON.stringify({ name, email, company: safeCompany, interest: safeInterest, message: message.slice(0, 500) }));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[LADDER:ERROR] Contact endpoint:", err);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
