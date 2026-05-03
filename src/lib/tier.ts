import { clerkClient } from "@clerk/nextjs/server";
import type { Tier } from "@/lib/plans";

/**
 * Read the Ladder tier for a user from Clerk publicMetadata.
 * Defaults to "free" when missing or invalid.
 */
export async function getUserTier(userId: string): Promise<Tier> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const raw = user.publicMetadata?.tier;
    if (raw === "pro" || raw === "team" || raw === "pulse") return raw;
    return "free";
  } catch {
    return "free";
  }
}

type SubscriptionMeta = {
  tier: Tier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
};

/**
 * Write subscription metadata back to Clerk.
 * - tier and currentPeriodEnd land in publicMetadata (used by client UI).
 * - Stripe IDs land in privateMetadata (server-only).
 */
export async function setUserSubscription(
  userId: string,
  meta: SubscriptionMeta
): Promise<void> {
  const client = await clerkClient();
  const existing = await client.users.getUser(userId);

  await client.users.updateUser(userId, {
    publicMetadata: {
      ...existing.publicMetadata,
      tier: meta.tier,
      currentPeriodEnd: meta.currentPeriodEnd,
      cancelAtPeriodEnd: meta.cancelAtPeriodEnd,
    },
    privateMetadata: {
      ...existing.privateMetadata,
      stripeCustomerId: meta.stripeCustomerId,
      stripeSubscriptionId: meta.stripeSubscriptionId,
    },
  });
}

/** Read the Stripe customer ID for a user (private metadata). */
export async function getStripeCustomerId(
  userId: string
): Promise<string | null> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const id = user.privateMetadata?.stripeCustomerId;
  return typeof id === "string" ? id : null;
}

/** Find a Clerk userId by Stripe customer ID. Used by webhooks. */
export async function userIdForStripeCustomer(
  customerId: string
): Promise<string | null> {
  const client = await clerkClient();
  const list = await client.users.getUserList({ limit: 100 });
  for (const u of list.data) {
    if (u.privateMetadata?.stripeCustomerId === customerId) return u.id;
  }
  return null;
}
