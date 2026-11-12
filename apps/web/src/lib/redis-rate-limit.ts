import "server-only";

import type { Redis } from "ioredis";

import { RateLimitExceeded, type RateLimiter } from "./rate-limit";
import { getRedis } from "./redis";

export interface RedisRateLimiterOptions {
  key: string;
  limit: number;
  windowMs: number;
  redis?: Redis | null;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Shared fixed-window limiter backed by Redis.
 *
 * Uses `INCR` + `PEXPIRE` so the budget is shared across every server process.
 * A single over-limit request waits for the window to roll over; if it is still
 * over budget after that it throws so the caller can decide (the TMDB client
 * maps it to a retryable error). Redis errors fail open.
 */
export function createRedisRateLimiter(options: RedisRateLimiterOptions): RateLimiter {
  const redis = options.redis === undefined ? getRedis() : options.redis;
  if (!redis) return { acquire: async () => undefined };

  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const { key, limit, windowMs } = options;

  return {
    async acquire(): Promise<void> {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        let count: number;
        try {
          count = await redis.incr(key);
          if (count === 1) await redis.pexpire(key, windowMs);
        } catch {
          return; // Fail open: never block traffic because Redis is unavailable.
        }

        if (count <= limit) return;

        const ttl = await redis
          .pttl(key)
          .then((value) => (typeof value === "number" && value > 0 ? value : windowMs))
          .catch(() => windowMs);

        if (attempt === 0) {
          await sleep(ttl);
          continue;
        }

        throw new RateLimitExceeded(Math.max(1, ttl));
      }

      throw new RateLimitExceeded(windowMs - (now() % windowMs));
    },
  };
}
