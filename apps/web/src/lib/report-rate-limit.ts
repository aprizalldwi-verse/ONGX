import "server-only";

import type { Redis } from "ioredis";

import { getRedis } from "./redis";
import { hitFixedWindow, type FixedWindowDecision } from "./redis-fixed-window";

export interface ReportLimitOptions {
  limit?: number;
  windowSec?: number;
  redis?: Redis | null;
}

export type ReportLimitDecision = FixedWindowDecision;

export const REPORT_LIMIT = 5;
export const REPORT_WINDOW_SEC = 10 * 60;

/**
 * Fixed-window limiter for anonymous reports: five requests per ten minutes per
 * IP. Over-limit requests are rejected immediately with `429`.
 */
export async function checkReportLimit(
  ip: string,
  options: ReportLimitOptions = {},
): Promise<ReportLimitDecision> {
  const redis = options.redis === undefined ? getRedis() : options.redis;

  return hitFixedWindow(
    redis,
    `ongx:report:${ip}`,
    options.limit ?? REPORT_LIMIT,
    options.windowSec ?? REPORT_WINDOW_SEC,
  );
}
