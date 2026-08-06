#!/usr/bin/env node
/**
 * One-shot backfill for #442: move inline base64 thumbnails out of the
 * per-user score-history zset (`user:{id}:scores`) into Vercel Blob, leaving
 * only a pointer key (`user:{id}:thumb:{scoreId}`) + `hasThumbnail: true` on
 * each entry.
 *
 * Why: entries embed a ~100-300KB base64 thumbnail, so a full-history read
 * transfers image weight it usually discards — one heavy account crossed
 * Upstash's 10MB request ceiling and 500'd the dashboard on 2026-08-05. #441
 * chunked the reads (tourniquet); this script + the persist change are the cure.
 *
 * Behavior:
 *   - Reads each user's history in small chunks (never a single ZRANGE 0 -1),
 *     so it can migrate the exact heavy accounts that motivated the ticket.
 *   - Idempotent: an entry with no inline `thumbnail` (already migrated, or
 *     never had one) is skipped. Safe to re-run.
 *   - Preserves each member's zset score (its timestamp) exactly via WITHSCORES.
 *
 * Usage:
 *   node scripts/backfill-score-thumbnails.mjs [--dry-run] [--user=<userId>]
 *
 *   --dry-run       report what would change, write nothing
 *   --user=<id>     migrate only this user (test on a small account first,
 *                   then the known-heavy account, before a full sweep)
 *
 * Requires (loaded from .env.local): KV_REST_API_URL / KV_REST_API_TOKEN (or
 * UPSTASH_REDIS_REST_URL / _TOKEN) and BLOB_READ_WRITE_TOKEN.
 */
import pkg from "@next/env";
import { Redis } from "@upstash/redis";
import { put } from "@vercel/blob";

const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd(), true);

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY_USER = (process.argv.find((a) => a.startsWith("--user=")) || "").split("=")[1] || null;
const CHUNK = 10; // matches zrangeAllChunked — safely under the 10MB ceiling
const DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is;

if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
  console.error("No Redis env found (KV_REST_API_URL / UPSTASH_REDIS_REST_URL). Add it to .env.local.");
  process.exit(1);
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN is not set. Run `vercel env pull .env.local` first.");
  process.exit(1);
}

const redis = Redis.fromEnv();

/** SCAN all `user:*:scores` keys (or just the one for --user). */
async function listHistoryKeys() {
  if (ONLY_USER) return [`user:${ONLY_USER}:scores`];
  const keys = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(cursor, { match: "user:*:scores", count: 200 });
    keys.push(...batch);
    cursor = next;
  } while (cursor !== "0");
  return keys;
}

/** Read every [member, score] pair for a key in small chunks (memory-safe,
 * request-safe). Returns objects so we can rewrite without re-scanning. */
async function readAllWithScores(key) {
  const out = [];
  for (let start = 0; ; start += CHUNK) {
    const slice = await redis.zrange(key, start, start + CHUNK - 1, { withScores: true });
    if (!slice || slice.length === 0) break;
    for (let i = 0; i < slice.length; i += 2) {
      out.push({ member: slice[i], score: Number(slice[i + 1]) });
    }
    if (slice.length < CHUNK * 2) break;
  }
  return out;
}

async function migrateUser(historyKey) {
  const userId = historyKey.slice("user:".length, -":scores".length);
  const rows = await readAllWithScores(historyKey);
  let migrated = 0;
  let skipped = 0;

  for (const { member, score } of rows) {
    // Upstash auto-deserializes JSON members; tolerate either shape.
    let entry;
    try {
      entry = typeof member === "string" ? JSON.parse(member) : member;
    } catch {
      skipped++;
      continue;
    }
    if (!entry || typeof entry !== "object") { skipped++; continue; }

    // Idempotent: only entries still carrying an inline data-URL thumbnail.
    const inline = entry.thumbnail;
    if (typeof inline !== "string" || !DATA_URL_RE.test(inline)) { skipped++; continue; }

    const scoreId = entry.id;
    if (!scoreId) { skipped++; continue; }

    if (DRY_RUN) {
      migrated++;
      continue;
    }

    const [, contentType, b64] = DATA_URL_RE.exec(inline);
    const bytes = Buffer.from(b64, "base64");
    const blob = await put(`score-thumbs/${userId}/${scoreId}`, bytes, {
      access: "private",
      contentType,
      addRandomSuffix: true,
    });

    // Pointer key, then rewrite the member: drop the inline bytes, flag it,
    // preserve the exact timestamp score. zrem old + zadd new is atomic enough
    // for a maintenance sweep (no concurrent writer touches a historical entry).
    const { thumbnail: _drop, ...rest } = entry;
    const rewritten = JSON.stringify({ ...rest, hasThumbnail: true });
    await redis.set(`user:${userId}:thumb:${scoreId}`, blob.url);
    const oldMember = typeof member === "string" ? member : JSON.stringify(member);
    await redis.zrem(historyKey, oldMember);
    await redis.zadd(historyKey, { score, member: rewritten });
    migrated++;
  }

  return { userId, total: rows.length, migrated, skipped };
}

async function main() {
  const keys = await listHistoryKeys();
  console.log(`${DRY_RUN ? "[DRY RUN] " : ""}Scanning ${keys.length} history key(s)...`);
  let totalMigrated = 0;
  for (const key of keys) {
    const r = await migrateUser(key);
    if (r.migrated > 0) {
      console.log(`  ${r.userId}: ${r.migrated} migrated, ${r.skipped} skipped (of ${r.total})`);
    }
    totalMigrated += r.migrated;
  }
  console.log(`${DRY_RUN ? "[DRY RUN] would migrate" : "Migrated"} ${totalMigrated} thumbnail(s) across ${keys.length} user(s).`);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
