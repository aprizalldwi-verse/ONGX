import "server-only";

import type { Redis } from "ioredis";

/**
 * Shared fixed-window limiter for anonymous request-scoped endpoints (reports,
 * search). Unlike the sync limiter this one never waits: an over-limit request
 * is rejected immediately with `429`. Redis failures fail open so a cache
 * outage cannot take the endpoint down.
 */

export interface FixedWindowDecision {
  allowed: boolean;
  retryAfterSec: number;
}

const ALLOWED: FixedWindowDecision = { allowed: true, retryAfterSec: 0 };

export async function hitFixedWindow(
  redis: Redis | null,
  key: string,
  limit: number,
  windowSec: number,
): Promise<FixedWindowDecision> {
  if (!redis) return ALLOWED;

  const safeLimit = Math.max(1, Math.trunc(limit));
  const safeWindow = Math.max(1, Math.trunc(windowSec));

  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, safeWindow);

    if (count <= safeLimit) return ALLOWED;

    const ttl = await redis.ttl(key);
    return { allowed: false, retryAfterSec: ttl > 0 ? ttl : safeWindow };
  } catch {
    return ALLOWED;
  }
}
