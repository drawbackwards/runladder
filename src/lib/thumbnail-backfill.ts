import { redis } from "@/lib/redis";
import { uploadScoreThumbnail } from "@/lib/thumbnail";
import { SCORE_THUMB_KEY } from "@/lib/scores";

/**
 * One-time backfill for #442: move inline base64 thumbnails out of the
 * per-user score-history zset (`user:{id}:scores`) into Vercel Blob, leaving
 * only a pointer key (`user:{id}:thumb:{scoreId}`) + `hasThumbnail: true`.
 *
 * This is the server-side twin of `scripts/backfill-score-thumbnails.mjs`
 * (used for dev). Prod Redis/Blob creds are marked Sensitive in Vercel and are
 * NOT returned by `vercel env pull`, so the prod migration can't run from a
 * laptop — it runs here, inside the prod runtime, via an admin route.
 *
 * Behavior: reads each user's history in small chunks (never a single
 * ZRANGE 0 -1), and is idempotent — an entry with no inline data-URL thumbnail
 * (already migrated, or never had one) is skipped, so it's safe to re-run.
 */

const CHUNK = 10; // matches zrangeAllChunked — safely under Upstash's 10MB ceiling
const DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i;

export type BackfillPerUser = {
  userId: string;
  total: number;
  migrated: number;
  skipped: number;
};

export type BackfillSummary = {
  dryRun: boolean;
  usersScanned: number;
  migrated: number;
  skipped: number;
  perUser: BackfillPerUser[];
};

async function listHistoryKeys(onlyUser?: string): Promise<string[]> {
  if (onlyUser) return [`user:${onlyUser}:scores`];
  const keys: string[] = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(cursor, {
      match: "user:*:scores",
      count: 200,
    });
    keys.push(...(batch as string[]));
    cursor = next;
  } while (cursor !== "0");
  return keys;
}

async function readAllWithScores(
  key: string,
): Promise<{ member: unknown; score: number }[]> {
  const out: { member: unknown; score: number }[] = [];
  for (let start = 0; ; start += CHUNK) {
    const slice = (await redis.zrange(key, start, start + CHUNK - 1, {
      withScores: true,
    })) as (string | number)[];
    if (!slice || slice.length === 0) break;
    for (let i = 0; i < slice.length; i += 2) {
      out.push({ member: slice[i], score: Number(slice[i + 1]) });
    }
    if (slice.length < CHUNK * 2) break;
  }
  return out;
}

export async function backfillScoreThumbnails(
  opts: { dryRun?: boolean; onlyUser?: string } = {},
): Promise<BackfillSummary> {
  const dryRun = !!opts.dryRun;
  const keys = await listHistoryKeys(opts.onlyUser);
  const perUser: BackfillPerUser[] = [];
  let migrated = 0;
  let skipped = 0;

  for (const historyKey of keys) {
    const userId = historyKey.slice("user:".length, -":scores".length);
    const rows = await readAllWithScores(historyKey);
    let m = 0;
    let s = 0;

    for (const { member, score } of rows) {
      let entry: unknown;
      try {
        entry = typeof member === "string" ? JSON.parse(member) : member;
      } catch {
        s++;
        continue;
      }
      if (!entry || typeof entry !== "object") {
        s++;
        continue;
      }
      const rec = entry as Record<string, unknown>;
      const inline = rec.thumbnail;
      // Idempotent: only entries still carrying an inline data-URL thumbnail.
      if (typeof inline !== "string" || !DATA_URL_RE.test(inline)) {
        s++;
        continue;
      }
      const scoreId = typeof rec.id === "string" ? rec.id : null;
      if (!scoreId) {
        s++;
        continue;
      }
      if (dryRun) {
        m++;
        continue;
      }

      const blobUrl = await uploadScoreThumbnail(userId, scoreId, inline);
      if (!blobUrl) {
        // Upload failed — leave the entry untouched so a re-run retries it.
        s++;
        continue;
      }

      const { thumbnail: _drop, ...rest } = rec;
      void _drop;
      const rewritten = JSON.stringify({ ...rest, hasThumbnail: true });
      await redis.set(SCORE_THUMB_KEY(userId, scoreId), blobUrl);
      const oldMember =
        typeof member === "string" ? member : JSON.stringify(member);
      await redis.zrem(historyKey, oldMember);
      await redis.zadd(historyKey, { score, member: rewritten });
      m++;
    }

    migrated += m;
    skipped += s;
    perUser.push({ userId, total: rows.length, migrated: m, skipped: s });
  }

  return { dryRun, usersScanned: keys.length, migrated, skipped, perUser };
}
