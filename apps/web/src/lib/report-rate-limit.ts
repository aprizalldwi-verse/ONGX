import "server-only";

import type { Redis } from "ioredis";

import { getRedis } from "./redis";

export interface ReportLimitOptions {
  limit?: number;
  windowSec?: number;
  redis?: Redis | null;
}

export interface ReportLimitDecision {
  allowed: boolean;
  retryAfterSec: number;
}

export const REPORT_LIMIT = 5;
export const REPORT_WINDOW_SEC = 10 * 60;

/**
 * Fixed-window limiter for anonymous reports. Unlike the sync limiter this one
 * never waits: an over-limit request is rejected immediately with `429`.
 * Redis failures fail open so a cache outage cannot disable reporting.
 */
export async function checkReportLimit(
  ip: string,
  options: ReportLimitOptions = {},
): Promise<ReportLimitDecision> {
  const redis = options.redis === undefined ? getRedis() : options.redis;
  if (!redis) return { allowed: true, retryAfterSec: 0 };

  const limit = Math.max(1, options.limit ?? REPORT_LIMIT);
  const windowSec = Math.max(1, options.windowSec ?? REPORT_WINDOW_SEC);
  const key = `ongx:report:${ip}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);

    if (count <= limit) return { allowed: true, retryAfterSec: 0 };

    const ttl = await redis.ttl(key);
    return { allowed: false, retryAfterSec: ttl > 0 ? ttl : windowSec };
  } catch {
    return { allowed: true, retryAfterSec: 0 };
  }
}
