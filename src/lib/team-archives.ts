import { redis } from "@/lib/redis";

/**
 * Per-org "archived members" Redis Set.
 *
 *   team:{orgId}:archived  -> Set<userId>
 *
 * When a manager archives a team member, we:
 *   1. Add the userId to this set (so the team API still knows about them).
 *   2. Remove them from the Clerk org (so they lose access).
 *
 * The team rollup includes archived members' historical scores in
 * insights / heatmap aggregates, but lists them in a separate "Archived"
 * section so they don't take a seat or read as active.
 *
 * Delete (hard removal) takes a different path: also remove from Clerk
 * org, but scrub from the archive set so they leave no trail at all.
 */

const archivedKey = (orgId: string) => `team:${orgId}:archived`;

export async function archiveMember(orgId: string, userId: string): Promise<void> {
  await redis.sadd(archivedKey(orgId), userId);
}

export async function unarchiveMember(orgId: string, userId: string): Promise<void> {
  await redis.srem(archivedKey(orgId), userId);
}

export async function listArchivedMembers(orgId: string): Promise<string[]> {
  const members = await redis.smembers(archivedKey(orgId));
  return (members ?? []).map((m) => String(m));
}

export async function isArchived(orgId: string, userId: string): Promise<boolean> {
  const result = await redis.sismember(archivedKey(orgId), userId);
  return result === 1;
}
