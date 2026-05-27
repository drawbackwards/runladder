/**
 * Anonymous web scoring (#187).
 *
 * A signed-out visitor can score ONE screen (see plans.ts ANON_LIMIT),
 * then gets the sign-up wall. We identify the browser with an httpOnly
 * `ladder_anon_id` cookie and guard cost two ways: a per-cookie cap and a
 * higher per-IP daily backstop. The scored result is stashed so it can be
 * claimed onto the user's account after they sign up (mirrors the
 * pending-comps claim pattern).
 *
 * Other Ladder surfaces (Skill, Plugin, MCP, API) still gate at the door.
 */

import type { NextRequest } from "next/server";
import {
  redis,
  anonUsedKey,
  anonIpRateKey,
  pendingScoreKey,
} from "@/lib/redis";
import { ANON_LIMIT, ANON_IP_DAILY_CAP } from "@/lib/plans";
import { persistScoreEntry, type ScoreEntryInput } from "@/lib/scores";

export const ANON_COOKIE = "ladder_anon_id";

const ANON_USED_TTL = 60 * 60 * 24 * 7; // 7 days
const ANON_IP_TTL = 60 * 60 * 24; // 24 hours
const PENDING_TTL = 60 * 60 * 24 * 7; // 7 days

/** Read the anon-id cookie, if present. */
export function readAnonId(req: NextRequest): string | null {
  return req.cookies.get(ANON_COOKIE)?.value ?? null;
}

/** Mint a fresh anon id (used when no cookie exists yet). */
export function mintAnonId(): string {
  return crypto.randomUUID();
}

/** Best-effort client IP from the proxy headers Vercel sets. */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export type AnonGate =
  | { allowed: true }
  | { allowed: false; reason: "cookie" | "ip" };

/**
 * Whether this anonymous browser/IP may score now. Checks the per-cookie
 * cap first, then the per-IP daily backstop.
 */
export async function assertAnonAllowed(
  anonId: string,
  ip: string,
): Promise<AnonGate> {
  const used = (await redis.get<number>(anonUsedKey(anonId))) ?? 0;
  if (used >= ANON_LIMIT) return { allowed: false, reason: "cookie" };
  const ipCount = (await redis.get<number>(anonIpRateKey(ip))) ?? 0;
  if (ipCount >= ANON_IP_DAILY_CAP) return { allowed: false, reason: "ip" };
  return { allowed: true };
}

/**
 * Record a successful anonymous score: bump the per-cookie + per-IP
 * counters (with TTLs) and stash the result for claim-on-signup. Call
 * this only AFTER scoring succeeds so failed scores aren't charged.
 */
export async function recordAnonScore(
  anonId: string,
  ip: string,
  entry: ScoreEntryInput,
): Promise<void> {
  await Promise.all([
    redis.incr(anonUsedKey(anonId)),
    redis.incr(anonIpRateKey(ip)),
    redis.set(pendingScoreKey(anonId), entry, { ex: PENDING_TTL }),
  ]);
  // incr doesn't set a TTL; (re)apply the expiries. Refreshing the IP
  // window on each score makes it a sliding 24h cap, which is fine for a
  // cost backstop.
  await Promise.all([
    redis.expire(anonUsedKey(anonId), ANON_USED_TTL),
    redis.expire(anonIpRateKey(ip), ANON_IP_TTL),
  ]);
}

/**
 * Attach a pending anonymous score to a freshly signed-up user, then
 * clear it. Returns the stored score id, or null if nothing was pending.
 * Idempotent — a second call after the delete is a no-op.
 */
export async function claimPendingAnonScore(
  anonId: string,
  userId: string,
): Promise<string | null> {
  const entry = await redis.get<ScoreEntryInput>(pendingScoreKey(anonId));
  if (!entry) return null;
  const stored = await persistScoreEntry(userId, entry);
  await redis.del(pendingScoreKey(anonId));
  return stored.id;
}
