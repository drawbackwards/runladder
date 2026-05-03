import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  stripe,
  assertStripeConfigured,
  tierForPriceId,
  isActiveSubscription,
} from "@/lib/stripe";
import { setUserSubscription, userIdForStripeCustomer } from "@/lib/tier";

export const runtime = "nodejs";

/**
 * Stripe webhook receiver. Validates the signature, then mirrors subscription
 * state into Clerk publicMetadata.tier so every surface (web, Skill, MCP, API)
 * sees a consistent tier.
 */
export async function POST(req: NextRequest) {
  try {
    assertStripeConfigured();

    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "STRIPE_WEBHOOK_SECRET is not configured." },
        { status: 500 }
      );
    }

    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing signature." }, { status: 400 });
    }

    const raw = await req.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(raw, sig, secret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bad signature";
      console.error("[LADDER:STRIPE] Signature verification failed:", msg);
      return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          session.client_reference_id ||
          (session.metadata?.clerkUserId as string | undefined);
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        if (userId && customerId) {
          // Subscription event will follow with full state — record the customer now.
          await setUserSubscription(userId, {
            tier: "pro",
            stripeCustomerId: customerId,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        const userId =
          (sub.metadata?.clerkUserId as string | undefined) ||
          (await userIdForStripeCustomer(customerId));

        if (!userId) {
          console.warn(
            "[LADDER:STRIPE] No Clerk user found for customer",
            customerId
          );
          break;
        }

        const priceId = sub.items.data[0]?.price?.id;
        const active = isActiveSubscription(sub.status);
        const tier = active ? tierForPriceId(priceId) : "free";

        await setUserSubscription(userId, {
          tier,
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          currentPeriodEnd: sub.items.data[0]?.current_period_end ?? undefined,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        });
        break;
      }

      default:
        // No-op for events we don't care about.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[LADDER:ERROR] Stripe webhook:", err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}
