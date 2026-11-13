import "server-only";

import type { Redis } from "ioredis";

import { getRedis } from "./redis";
import { hitFixedWindow, type FixedWindowDecision } from "./redis-fixed-window";
import { SEARCH_RATE_LIMIT, SEARCH_RATE_WINDOW_SEC } from "./search";

export interface SearchLimitOptions {
  limit?: number;
  windowSec?: number;
  redis?: Redis | null;
}

export type SearchLimitDecision = FixedWindowDecision;

/**
 * Search is cheap but hit on every keystroke (debounced), so the budget is
 * generous: 120 requests per minute per IP. Over-limit requests get `429` with
 * `retry-after` instead of a queue.
 */
export async function checkSearchLimit(
  ip: string,
  options: SearchLimitOptions = {},
): Promise<SearchLimitDecision> {
  const redis = options.redis === undefined ? getRedis() : options.redis;

  return hitFixedWindow(
    redis,
    `ongx:search:${ip}`,
    options.limit ?? SEARCH_RATE_LIMIT,
    options.windowSec ?? SEARCH_RATE_WINDOW_SEC,
  );
}
