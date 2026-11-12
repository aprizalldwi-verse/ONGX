/**
 * Fixed-window rate limiting. The pure evaluator is unit tested; the Redis
 * implementation lives in `redis-rate-limit.ts` so this module stays
 * dependency-free and importable from tests.
 */

export interface RateLimiter {
  /** Resolves when a slot is available, throws `RateLimitExceeded` otherwise. */
  acquire(): Promise<void>;
}

export class RateLimitExceeded extends Error {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`Rate limit exceeded; retry in ${retryAfterMs}ms`);
    this.name = "RateLimitExceeded";
    this.retryAfterMs = retryAfterMs;
  }
}

export const noopRateLimiter: RateLimiter = {
  async acquire(): Promise<void> {
    // Intentionally empty: no budget configured (e.g. tests, Redis disabled).
  },
};

export interface WindowState {
  /** Epoch ms at the start of the window this count belongs to. */
  windowStart: number;
  count: number;
}

export interface WindowDecision {
  allowed: boolean;
  /** Milliseconds until the current window resets; 0 when allowed. */
  retryAfterMs: number;
  next: WindowState;
}

/**
 * Evaluate one request against a fixed window. Windows are aligned to the
 * epoch (`floor(now / windowMs)`), which keeps every process in agreement
 * without needing a shared clock.
 */
export function evaluateFixedWindow(
  state: WindowState | null,
  now: number,
  limit: number,
  windowMs: number,
): WindowDecision {
  const safeWindowMs = Math.max(1, windowMs);
  const safeLimit = Math.max(1, limit);
  const windowStart = Math.floor(now / safeWindowMs) * safeWindowMs;
  const count = state !== null && state.windowStart === windowStart ? state.count : 0;
  const nextCount = count + 1;

  if (nextCount <= safeLimit) {
    return { allowed: true, retryAfterMs: 0, next: { windowStart, count: nextCount } };
  }

  return {
    allowed: false,
    retryAfterMs: Math.max(1, windowStart + safeWindowMs - now),
    next: { windowStart, count },
  };
}
