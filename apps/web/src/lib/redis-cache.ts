import "server-only";

import type { Redis } from "ioredis";

import type { CacheStore } from "./cache";
import { getRedis } from "./redis";

/**
 * Redis-backed cache. Every operation fails open: a Redis outage degrades to
 * uncached TMDB calls instead of taking the site down.
 */
export class RedisCache implements CacheStore {
  constructor(private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, value, "EX", Math.max(1, Math.trunc(ttlSeconds)));
    } catch {
      // Ignore: cache is best-effort.
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      // Ignore.
    }
  }
}

let cache: RedisCache | null = null;

export function getRedisCache(): RedisCache | null {
  const redis = getRedis();
  if (!redis) return null;

  if (!cache) cache = new RedisCache(redis);
  return cache;
}
