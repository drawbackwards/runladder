import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  stripe,
  assertStripeConfigured,
  STRIPE_PRO_PRICE_ID,
} from "@/lib/stripe";
import { getStripeCustomerId, setUserSubscription } from "@/lib/tier";

async function createCheckoutSession(req: NextRequest, plan: string) {
  assertStripeConfigured();

  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  if (plan !== "pro") {
    return null;
  }

  if (!STRIPE_PRO_PRICE_ID) {
    return null;
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress;

  let customerId = await getStripeCustomerId(userId);
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
      metadata: { clerkUserId: userId },
    });
    customerId = customer.id;
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

  return session.url;
}

/**
 * GET /api/stripe/checkout?plan=pro
 * Called after Clerk auth redirect — creates a session and redirects straight to Stripe.
 */
export async function GET(req: NextRequest) {
  try {
    const plan = new URL(req.url).searchParams.get("plan") || "pro";
    const url = await createCheckoutSession(req, plan);
    if (!url) {
      return NextResponse.redirect(new URL("/pricing?checkout_error=1", req.url));
    }
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[LADDER:ERROR] Stripe checkout GET:", err);
    return NextResponse.redirect(new URL("/pricing?checkout_error=1", req.url));
  }
}

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for the signed-in user and the requested plan.
 * Body: { plan: "pro" } — only "pro" is self-serve today.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { plan?: string };
    const plan = body.plan ?? "pro";

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    if (plan !== "pro") return NextResponse.json({ error: "That plan isn't self-serve. Visit /contact for Team or Pulse." }, { status: 400 });
    if (!STRIPE_PRO_PRICE_ID) return NextResponse.json({ error: "STRIPE_PRO_PRICE_ID is not configured." }, { status: 500 });

    const url = await createCheckoutSession(req, plan);
    if (!url) return NextResponse.json({ error: "Checkout failed." }, { status: 500 });
    return NextResponse.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Checkout failed.";
    console.error("[LADDER:ERROR] Stripe checkout:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
