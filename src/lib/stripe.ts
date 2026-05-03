import Stripe from "stripe";
import type { Tier } from "@/lib/plans";

const secret = process.env.STRIPE_SECRET_KEY;

export const stripe: Stripe = secret
  ? new Stripe(secret)
  : (null as unknown as Stripe);

export function assertStripeConfigured(): void {
  if (!secret) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in the environment."
    );
  }
}

export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || "";

/**
 * Map a Stripe price ID to a Ladder tier.
 * Today only Pro is self-serve; Team and Pulse are sold via Drawbackwards.
 */
export function tierForPriceId(priceId: string | null | undefined): Tier {
  if (!priceId) return "free";
  if (priceId === STRIPE_PRO_PRICE_ID) return "pro";
  return "free";
}

/** Statuses that should grant access to the paid tier. */
const ACTIVE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due", // grace period — Stripe Smart Retries will recover or cancel
]);

export function isActiveSubscription(
  status: Stripe.Subscription.Status
): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(status);
}
