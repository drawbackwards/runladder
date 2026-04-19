/**
 * Skill token authentication.
 *
 * Tokens are raw random strings shown to the user ONCE on generation.
 * Only the SHA-256 hash is persisted. The lookup index
 * (skill_token:{hash} -> userId) is how the /api/skill/score endpoint
 * resolves a Bearer token to a user.
 *
 * Redis keys:
 *   skill_token:{hash}         -> userId                 (lookup)
 *   user:{userId}:skill        -> { hash, prefix, createdAt, lastUsedAt, installedVersion }
 */
import { createHash, randomBytes } from "crypto";
import { redis } from "@/lib/redis";

export const TOKEN_PREFIX = "ladder_skl_";

export type SkillTokenMeta = {
  hash: string;
  prefix: string;      // first chars of raw token, shown in dashboard (no security value)
  createdAt: number;
  lastUsedAt?: number;
  installedVersion?: string; // last X-Ladder-Skill-Version seen from score.py
};

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Generate a new raw token. Caller is responsible for showing it once and discarding. */
export function generateRawToken(): string {
  return TOKEN_PREFIX + randomBytes(24).toString("base64url");
}

/**
 * Rotate (or create) the user's skill token. Revokes the previous one.
 * Returns the raw token — must be shown once and never stored.
 */
export async function rotateSkillToken(userId: string): Promise<string> {
  // Revoke existing if any
  const existing = await redis.get<SkillTokenMeta>(`user:${userId}:skill`);
  if (existing?.hash) {
    await redis.del(`skill_token:${existing.hash}`);
  }

  const raw = generateRawToken();
  const hash = hashToken(raw);
  const prefix = raw.slice(0, TOKEN_PREFIX.length + 4);

  const meta: SkillTokenMeta = {
    hash,
    prefix,
    createdAt: Date.now(),
  };

  await Promise.all([
    redis.set(`user:${userId}:skill`, meta),
    redis.set(`skill_token:${hash}`, userId),
  ]);

  return raw;
}

/** Revoke the user's skill token, if any. */
export async function revokeSkillToken(userId: string): Promise<void> {
  const existing = await redis.get<SkillTokenMeta>(`user:${userId}:skill`);
  if (existing?.hash) {
    await redis.del(`skill_token:${existing.hash}`);
  }
  await redis.del(`user:${userId}:skill`);
}

/** Get metadata about the current token (for the dashboard). Never returns the raw token. */
export async function getSkillTokenMeta(
  userId: string
): Promise<SkillTokenMeta | null> {
  return (await redis.get<SkillTokenMeta>(`user:${userId}:skill`)) ?? null;
}

/** Resolve a raw Bearer token to a userId. Returns null if the token is unknown. */
export async function userIdFromBearer(raw: string): Promise<string | null> {
  if (!raw || !raw.startsWith(TOKEN_PREFIX)) return null;
  const hash = hashToken(raw);
  const userId = await redis.get<string>(`skill_token:${hash}`);
  return userId ?? null;
}

/** Update the lastUsedAt timestamp on a skill token (best-effort, fire and forget). */
export async function touchSkillToken(
  userId: string,
  installedVersion?: string
): Promise<void> {
  const existing = await redis.get<SkillTokenMeta>(`user:${userId}:skill`);
  if (!existing) return;
  await redis.set(`user:${userId}:skill`, {
    ...existing,
    lastUsedAt: Date.now(),
    ...(installedVersion ? { installedVersion } : {}),
  });
}
