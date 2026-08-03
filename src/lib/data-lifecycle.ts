import { clerkClient } from "@clerk/nextjs/server";
import { del as blobDel } from "@vercel/blob";
import { redis } from "@/lib/redis";
import { listArchivedMembers } from "@/lib/team-archives";
import { isProvisioningUser, orgMeta } from "@/lib/orgs";
import {
  backfillLearningForUser,
  normalizeIndustry,
} from "@/lib/learning";
import type { StoredScoreEntry } from "@/lib/scores";

/**
 * Contract-termination data lifecycle (#398). De-identify-then-delete: a
 * user's score history is first projected into the de-identified learning
 * store (#422, src/lib/learning.ts), then every per-user and per-org
 * Customer Content key is deleted. Design + full key inventory:
 * docs/data-lifecycle-and-learning.md.
 *
 * Callers: the daily cron (/api/cron/data-lifecycle) 30 days after an org is
 * marked terminated, and the admin org DELETE route (deletion cascades).
 */

export type UserPurgeResult = {
  userId: string;
  skipped: "other-org" | null;
  scores: number;
  learningRecords: number;
  keysDeleted: number;
};

export type OrgPurgeResult = {
  orgId: string;
  industry: string;
  users: UserPurgeResult[];
  orgKeysDeleted: number;
  styleGuideBlobDeleted: boolean;
};

/** Collect every key matching a pattern via SCAN (never KEYS). */
async function scanKeys(match: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor: string | number = 0;
  do {
    const [next, batch]: [string | number, string[]] = await redis.scan(
      cursor,
      { match, count: 200 },
    );
    keys.push(...batch);
    cursor = next;
  } while (String(cursor) !== "0");
  return keys;
}

/** Delete keys in batches; returns how many were passed. */
async function delKeys(keys: string[]): Promise<number> {
  for (let i = 0; i < keys.length; i += 100) {
    const batch = keys.slice(i, i + 100);
    if (batch.length) await redis.del(...batch);
  }
  return keys.length;
}

/** Read a user's full score history as parsed entries. */
async function readScoreHistory(userId: string): Promise<StoredScoreEntry[]> {
  const raw = await redis.zrange<(StoredScoreEntry | string)[]>(
    `user:${userId}:scores`,
    0,
    -1,
  );
  const entries: StoredScoreEntry[] = [];
  for (const item of raw ?? []) {
    if (item && typeof item === "object") {
      entries.push(item as StoredScoreEntry);
      continue;
    }
    try {
      entries.push(JSON.parse(String(item)) as StoredScoreEntry);
    } catch {
      // unparseable member — deleted with the zset either way
    }
  }
  return entries;
}

/**
 * True if the user belongs to any org other than `purgingOrgId`. Such users'
 * history is not solely this client's Customer Content, so the purge skips
 * them and reports it for manual review.
 */
async function isMemberOfOtherOrg(
  userId: string,
  purgingOrgId: string,
): Promise<boolean> {
  const client = await clerkClient();
  try {
    const memberships = await client.users.getOrganizationMembershipList({
      userId,
      limit: 20,
    });
    return memberships.data.some((m) => m.organization.id !== purgingOrgId);
  } catch {
    // Unknown user (e.g. account already deleted) — nothing blocks the purge.
    return false;
  }
}

/**
 * De-identify (backfill the learning store) then delete one user's content.
 * Exported for the admin-triggered path; most callers go through purgeOrg.
 */
export async function purgeUserContent(
  userId: string,
  industry: string,
): Promise<Omit<UserPurgeResult, "skipped">> {
  const entries = await readScoreHistory(userId);
  const learningRecords = await backfillLearningForUser(
    userId,
    entries,
    industry,
  );

  // Fixed keys from the inventory (docs/data-lifecycle-and-learning.md §1).
  const fixed = [
    `user:${userId}:scores`,
    `user:${userId}:stats`,
    `user:${userId}:lifetime_scans_used`,
    `user:${userId}:skill`,
    `user:${userId}:plugin`,
    `learn:captured:${userId}`,
    `learn:ctx:${userId}`,
  ];

  // The Skill token lookup key is hash-addressed; resolve it before the
  // user-side pointer is deleted.
  const skillMeta = await redis
    .get<{ hash?: string }>(`user:${userId}:skill`)
    .catch(() => null);
  if (skillMeta?.hash) fixed.push(`skill_token:${skillMeta.hash}`);

  const scanned = (
    await Promise.all([
      scanKeys(`user:${userId}:lastscore:*`),
      scanKeys(`user:${userId}:screens:*`),
      scanKeys(`user:${userId}:scans:*`),
      scanKeys(`user:${userId}:cap_alert:*`),
      scanKeys(`usage:cost:${userId}:*`),
      scanKeys(`score-annotations:${userId}:*`),
      scanKeys(`score-feedback:*:${userId}`),
    ])
  ).flat();

  const keysDeleted = await delKeys([...fixed, ...scanned]);
  await Promise.all([
    redis.zrem("leaderboard:global:avg", userId),
    redis.zrem("leaderboard:global:scans", userId),
  ]);

  return { userId, scores: entries.length, learningRecords, keysDeleted };
}

/**
 * Purge an org's Customer Content: every member's per-user content (current
 * Clerk members + archived ex-members, minus the provisioning account and
 * minus anyone who also belongs to another org), then the org-level keys and
 * the style-guide Blob. Does NOT touch the Clerk org itself — the caller
 * stamps purgedAt (cron) or deletes the org (admin DELETE).
 */
export async function purgeOrgContent(orgId: string): Promise<OrgPurgeResult> {
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({
    organizationId: orgId,
  });
  const meta = orgMeta(org);
  const industry = normalizeIndustry(meta.industry);

  const memberships = await client.organizations.getOrganizationMembershipList(
    { organizationId: orgId, limit: 100 },
  );
  const memberIds = memberships.data
    .map((m) => m.publicUserData?.userId)
    .filter((id): id is string => !!id);
  const archivedIds = await listArchivedMembers(orgId);
  const userIds = [...new Set([...memberIds, ...archivedIds])].filter(
    (id) => !isProvisioningUser(id),
  );

  const users: UserPurgeResult[] = [];
  for (const userId of userIds) {
    // Archived members were already removed from this org in Clerk, so "any
    // remaining org" disqualifies them the same way it does current members.
    const otherOrg = await isMemberOfOtherOrg(
      userId,
      // current members: other-than-this-org; archived: any org at all
      memberIds.includes(userId) ? orgId : "__none__",
    );
    if (otherOrg) {
      users.push({
        userId,
        skipped: "other-org",
        scores: 0,
        learningRecords: 0,
        keysDeleted: 0,
      });
      continue;
    }
    users.push({ skipped: null, ...(await purgeUserContent(userId, industry)) });
  }

  // Org-level keys. style:cache + pool_alert entries are TTL'd but swept
  // anyway so the purge is complete the moment it runs.
  const orgKeys = [
    `org:${orgId}:style-guide`,
    `team:${orgId}:archived`,
    ...(await scanKeys(`org:${orgId}:pool_alert:*`)),
    ...(await scanKeys(`style:cache:${orgId}:*`)),
  ];
  const orgKeysDeleted = await delKeys(orgKeys);

  let styleGuideBlobDeleted = false;
  if (meta.styleGuide?.blobUrl) {
    try {
      await blobDel(meta.styleGuide.blobUrl);
      styleGuideBlobDeleted = true;
    } catch (e) {
      console.error(`[LIFECYCLE] blob delete failed for ${orgId}:`, e);
    }
  }

  return { orgId, industry, users, orgKeysDeleted, styleGuideBlobDeleted };
}
