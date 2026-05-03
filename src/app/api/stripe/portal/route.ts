import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe, assertStripeConfigured } from "@/lib/stripe";
import { getStripeCustomerId } from "@/lib/tier";

/**
 * POST /api/stripe/portal
 * Opens the Stripe Customer Portal for the signed-in user.
 */
export async function POST(req: NextRequest) {
  try {
    assertStripeConfigured();

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const customerId = await getStripeCustomerId(userId);
    if (!customerId) {
      return NextResponse.json(
        { error: "No subscription found." },
        { status: 404 }
      );
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      `https://${req.headers.get("host")}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Portal failed.";
    console.error("[LADDER:ERROR] Stripe portal:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
