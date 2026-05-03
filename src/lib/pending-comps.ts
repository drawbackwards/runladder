import { redis } from "@/lib/redis";
import type { Tier } from "@/lib/plans";

/**
 * Pending comps — comps issued for an email that has no Ladder account yet.
 * On the user's first authenticated action (any call into getUserSubscription),
 * the pending record is consumed and converted into a real comp on their
 * Clerk publicMetadata. After that, they're indistinguishable from any other
 * comped user.
 *
 * Redis schema:
 * - pending-comp:{lowercased-email}  JSON  { tier, reason, grantedAt, expiresAt? }
 * - pending-comp:index               Set   of lowercased emails (for admin listing)
 */

export type PendingComp = {
  email: string;
  tier: Exclude<Tier, "free">;
  reason: string;
  grantedAt: number;
  expiresAt?: number;
};

const INDEX_KEY = "pending-comp:index";

function recordKey(email: string): string {
  return `pending-comp:${email.toLowerCase()}`;
}

export async function setPendingComp(comp: PendingComp): Promise<void> {
  const email = comp.email.toLowerCase();
  await Promise.all([
    redis.set(recordKey(email), JSON.stringify({ ...comp, email })),
    redis.sadd(INDEX_KEY, email),
  ]);
}

export async function getPendingComp(email: string): Promise<PendingComp | null> {
  const raw = await redis.get<string | PendingComp>(recordKey(email));
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as PendingComp;
    } catch {
      return null;
    }
  }
  return raw;
}

export async function deletePendingComp(email: string): Promise<void> {
  const lower = email.toLowerCase();
  await Promise.all([
    redis.del(recordKey(lower)),
    redis.srem(INDEX_KEY, lower),
  ]);
}

export async function listPendingComps(): Promise<PendingComp[]> {
  const emails = (await redis.smembers(INDEX_KEY)) as string[];
  if (!emails || emails.length === 0) return [];
  const records = await Promise.all(emails.map((e) => getPendingComp(e)));
  return records.filter((r): r is PendingComp => r !== null);
}
