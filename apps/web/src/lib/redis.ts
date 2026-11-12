import "server-only";

import { Redis } from "ioredis";

let client: Redis | null = null;

/**
 * Lazy Redis client. Returns `null` when `REDIS_URL` is not configured so the app
 * still boots in environments without Redis (health reports "disabled").
 */
export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url || url.trim().length === 0) return null;

  if (!client) {
    client = new Redis(url, {
      lazyConnect: true,
      connectTimeout: 2_000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    client.on("error", (error: Error) => {
      // ioredis emits on every reconnect attempt; log once per error to avoid noise.
      console.error("[redis]", error.message);
    });
  }

  return client;
}
