import "server-only";

import { MemoryCache } from "@/lib/cache";
import { env } from "@/lib/env";
import { createRedisRateLimiter } from "@/lib/redis-rate-limit";
import { getRedis } from "@/lib/redis";
import { getRedisCache } from "@/lib/redis-cache";

import { TmdbAdapter } from "./adapter";
import { TMDB_RATE_LIMIT } from "./client";

export { TmdbAdapter } from "./adapter";
export { TMDB_RATE_LIMIT, TMDB_TTL, TmdbError } from "./client";
export { tmdbImage, type TmdbImageSize } from "./images";

let adapter: TmdbAdapter | null = null;

/**
 * Process-wide singleton: one cache and one rate-limit budget per server
 * instance. Redis is shared across instances; without Redis the client falls
 * back to an in-memory cache and an unlimited (no-op) limiter.
 */
export function getTmdbAdapter(): TmdbAdapter {
  if (adapter) return adapter;

  const redis = getRedis();

  adapter = new TmdbAdapter({
    apiKey: env.TMDB_API_KEY,
    region: env.TMDB_REGION,
    cache: getRedisCache() ?? new MemoryCache(),
    limiter: createRedisRateLimiter({
      redis,
      key: "ratelimit:tmdb",
      limit: TMDB_RATE_LIMIT.limit,
      windowMs: TMDB_RATE_LIMIT.windowMs,
    }),
  });

  return adapter;
}
