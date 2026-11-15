import type { RateLimiter } from "@/lib/rate-limit";

/**
 * In-process fixed-window limiter. The Redis helper in `redis-rate-limit.ts` is
 * bound to a request/IP and marked `server-only`; background jobs need their own
 * per-process budget instead.
 */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function localLimiter(limit: number, windowMs: number): RateLimiter {
  const timestamps: number[] = [];

  return {
    async acquire(): Promise<void> {
      for (;;) {
        const now = Date.now();
        while (timestamps.length > 0 && now - (timestamps[0] ?? 0) >= windowMs) {
          timestamps.shift();
        }

        if (timestamps.length < limit) {
          timestamps.push(now);
          return;
        }

        await sleep(windowMs - (now - (timestamps[0] ?? now)));
      }
    },
  };
}
