import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/*
  Redis key schema:
  - votes:{slug}                       Hash { total: float, count: int }
  - user:{userId}:scores               Sorted set (timestamp as score, JSON payload as member)
  - user:{userId}:lifetime_scans_used  Integer counter, never resets — drives the free-tier cap
  - rate:anon:{ip}                     Integer counter with 24h TTL for anonymous rate limiting
*/

export function lifetimeScansKey(userId: string): string {
  return `user:${userId}:lifetime_scans_used`;
}
