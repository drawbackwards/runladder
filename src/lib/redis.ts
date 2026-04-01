import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/*
  Redis key schema:
  - votes:{slug}              Hash { total: float, count: int }
  - user:{userId}:scores      Sorted set (timestamp as score, JSON payload as member)
  - user:{userId}:usage:{YYYY-MM}  Integer counter for monthly rate limiting
  - rate:anon:{ip}            Integer counter with 24h TTL for anonymous rate limiting
*/
