import { clerkClient } from "@clerk/nextjs/server";
import type { Tier } from "@/lib/plans";
import { getPendingComp, deletePendingComp } from "@/lib/pending-comps";

/** Comp metadata stored on Clerk publicMetadata alongside `tier`. */
export type CompInfo = {
  comp: true;
  /** Why this comp was granted (e.g. "Lumin partner", "Friend of DB"). */
  reason: string;
  /** Optional ISO ms timestamp. After this point the comp is treated as expired. */
  expiresAt?: number;
  /** ISO ms when the comp was granted. */
  grantedAt: number;
};

/** Full subscription read for a user — tier plus comp attributes. */
export type Subscription = {
  tier: Tier;
  /** Present iff tier is paid via comp (not Stripe). Undefined means a real Stripe sub or free. */
  comp?: CompInfo;
};

function readComp(meta: Record<string, unknown> | undefined): CompInfo | undefined {
  if (!meta || meta.comp !== true) return undefined;
  const reason = typeof meta.compReason === "string" ? meta.compReason : "";
  const expiresAt =
    typeof meta.compExpiresAt === "number" ? meta.compExpiresAt : undefined;
  const grantedAt =
    typeof meta.compGrantedAt === "number" ? meta.compGrantedAt : Date.now();
  return { comp: true, reason, expiresAt, grantedAt };
}

function isExpired(comp: CompInfo | undefined): boolean {
  if (!comp || comp.expiresAt == null) return false;
  return comp.expiresAt < Date.now();
}

/**
 * Read the Ladder tier for a user from Clerk publicMetadata.
 * - Honors comps: if `comp: true` and `compExpiresAt` has passed, falls back to "free".
 * - Defaults to "free" when missing or invalid.
 */
export async function getUserTier(userId: string): Promise<Tier> {
  const sub = await getUserSubscription(userId);
  return sub.tier;
}

/**
 * Read the full subscription state — tier plus comp attributes if present.
 *
 * Side-effect: if no comp metadata is set and a pending comp exists for
 * this user's email (issued by an admin before the user signed up), the
 * pending record is consumed and converted into a real comp on Clerk
 * publicMetadata. After this first call the user is indistinguishable
 * from any other comped user.
 *
 * Comp is only returned when `comp: true` AND not expired.
 */
export async function getUserSubscription(userId: string): Promise<Subscription> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const meta = user.publicMetadata as Record<string, unknown> | undefined;
    const raw = meta?.tier;
    const tier: Tier =
      raw === "pro" || raw === "team" || raw === "pulse" ? raw : "free";
    const comp = readComp(meta);
    if (comp && isExpired(comp)) {
      // Treat expired comp as free (do not surface comp metadata to UI).
      return { tier: "free" };
    }

    // Auto-claim a pending comp if there's no active one yet. Pending comps
    // are admin-issued for an email before the recipient signed up.
    if (!comp) {
      const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
      if (email) {
        const pending = await getPendingComp(email).catch(() => null);
        if (pending) {
          await grantComp(userId, {
            tier: pending.tier,
            reason: pending.reason,
            expiresAt: pending.expiresAt,
          });
          await deletePendingComp(email).catch(() => {});
          return {
            tier: pending.tier,
            comp: {
              comp: true,
              reason: pending.reason,
              grantedAt: pending.grantedAt,
              expiresAt: pending.expiresAt,
            },
          };
        }
      }
    }

    return comp ? { tier, comp } : { tier };
  } catch {
    return { tier: "free" };
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
 *
 * Stripe writes never touch the comp.* keys — comps and Stripe subscriptions
 * are independent. Use grantComp / revokeComp for comp management.
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

/** Grant a complimentary tier to a user. Idempotent — overwrites prior comp. */
export async function grantComp(
  userId: string,
  args: { tier: Exclude<Tier, "free">; reason: string; expiresAt?: number }
): Promise<void> {
  const client = await clerkClient();
  const existing = await client.users.getUser(userId);
  await client.users.updateUser(userId, {
    publicMetadata: {
      ...existing.publicMetadata,
      tier: args.tier,
      comp: true,
      compReason: args.reason,
      compGrantedAt: Date.now(),
      ...(args.expiresAt ? { compExpiresAt: args.expiresAt } : { compExpiresAt: undefined }),
    },
  });
}

/**
 * Revoke a comp. Resets the user to "free" and strips comp metadata.
 * Does not affect Stripe IDs — if the user also had a real subscription
 * (uncommon), their Stripe state remains intact in privateMetadata.
 */
export async function revokeComp(userId: string): Promise<void> {
  const client = await clerkClient();
  const existing = await client.users.getUser(userId);
  const next = { ...existing.publicMetadata } as Record<string, unknown>;
  next.tier = "free";
  delete next.comp;
  delete next.compReason;
  delete next.compGrantedAt;
  delete next.compExpiresAt;
  await client.users.updateUser(userId, { publicMetadata: next });
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
