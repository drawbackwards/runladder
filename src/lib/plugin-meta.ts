/**
 * Figma plugin install metadata.
 *
 * The plugin authenticates with the user's Ladder personal token (the
 * same one the Skill uses), so we don't store a separate token here.
 * What we DO track per user is which plugin version they have running
 * — used to:
 *   - Show "Update available" banners on the dashboard
 *   - Tell the plugin itself, on each verify-token call, what version
 *     the user has so it can render an in-plugin banner
 *
 * Redis key:
 *   user:{userId}:plugin  -> { installedVersion, lastUsedAt }
 *
 * Mirrors src/lib/skill-auth.ts conceptually but without any
 * token/hash storage (the plugin reuses the skill token).
 */
import { redis } from "@/lib/redis";

export type PluginMeta = {
  installedVersion?: string;
  lastUsedAt?: number;
};

const key = (userId: string) => `user:${userId}:plugin`;

export async function getPluginMeta(userId: string): Promise<PluginMeta | null> {
  return (await redis.get<PluginMeta>(key(userId))) ?? null;
}

/**
 * Record the plugin version the user is running, plus a last-seen
 * timestamp. Called on every verify-token request that carries an
 * X-Ladder-Plugin-Version header. Fire-and-forget at call sites — a
 * failed write should never block a verify response.
 */
export async function touchPluginMeta(
  userId: string,
  installedVersion?: string,
): Promise<void> {
  const existing = (await redis.get<PluginMeta>(key(userId))) ?? {};
  await redis.set(key(userId), {
    ...existing,
    lastUsedAt: Date.now(),
    ...(installedVersion ? { installedVersion } : {}),
  });
}
