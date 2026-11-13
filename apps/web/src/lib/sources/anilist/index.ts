import "server-only";

import { MemoryCache } from "@/lib/cache";
import { createRedisRateLimiter } from "@/lib/redis-rate-limit";
import { getRedis } from "@/lib/redis";
import { getRedisCache } from "@/lib/redis-cache";

import { AniListAdapter } from "./adapter";
import { ANILIST_RATE_LIMIT } from "./client";

export { AniListAdapter, parseAniListId } from "./adapter";
export { ANILIST_RATE_LIMIT, ANILIST_TTL, AniListError } from "./client";
export { normalizeAniListMedia, stripHtml } from "./normalize";

let adapter: AniListAdapter | null = null;

/**
 * Process-wide singleton: one cache and one rate-limit budget per server
 * instance. AniList needs no API key, so this works as soon as Redis is up.
 */
export function getAniListAdapter(): AniListAdapter {
  if (adapter) return adapter;

  const redis = getRedis();

  adapter = new AniListAdapter({
    cache: getRedisCache() ?? new MemoryCache(),
    limiter: createRedisRateLimiter({
      redis,
      key: "ratelimit:anilist",
      limit: ANILIST_RATE_LIMIT.limit,
      windowMs: ANILIST_RATE_LIMIT.windowMs,
    }),
  });

  return adapter;
}
