import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  stripe,
  assertStripeConfigured,
  STRIPE_PRO_PRICE_ID,
} from "@/lib/stripe";
import { getStripeCustomerId, setUserSubscription } from "@/lib/tier";

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for the signed-in user and the requested plan.
 * Body: { plan: "pro" } — only "pro" is self-serve today.
 */
export async function POST(req: NextRequest) {
  try {
    assertStripeConfigured();

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { plan?: string };
    const plan = body.plan ?? "pro";

    if (plan !== "pro") {
      return NextResponse.json(
        { error: "That plan isn't self-serve. Visit /contact for Team or Pulse." },
        { status: 400 }
      );
    }

    if (!STRIPE_PRO_PRICE_ID) {
      return NextResponse.json(
        { error: "STRIPE_PRO_PRICE_ID is not configured." },
        { status: 500 }
      );
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.primaryEmailAddress?.emailAddress;

    /* ── Reuse or create the Stripe customer for this Clerk user ── */
    let customerId = await getStripeCustomerId(userId);
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
        metadata: { clerkUserId: userId },
      });
      customerId = customer.id;
      // Stash the customer ID immediately so retries don't create duplicates.
      await setUserSubscription(userId, {
        tier: "free",
        stripeCustomerId: customerId,
      });
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      `https://${req.headers.get("host")}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: STRIPE_PRO_PRICE_ID, quantity: 1 }],
      client_reference_id: userId,
      subscription_data: {
        metadata: { clerkUserId: userId, tier: "pro" },
      },
      success_url: `${origin}/dashboard?upgraded=pro`,
      cancel_url: `${origin}/pricing?canceled=1`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Checkout failed.";
    console.error("[LADDER:ERROR] Stripe checkout:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
