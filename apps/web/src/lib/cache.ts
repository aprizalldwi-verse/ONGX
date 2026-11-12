/**
 * Minimal cache abstraction so the TMDB client can be tested without Redis and
 * still fall back to an in-process cache when Redis is not configured.
 */
export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

/**
 * Bounded in-memory TTL cache. Used in tests and as the Redis-less fallback;
 * never assume it is shared between processes.
 */
export class MemoryCache implements CacheStore {
  private readonly entries = new Map<string, MemoryEntry>();

  constructor(
    private readonly maxEntries = 500,
    private readonly now: () => number = Date.now,
  ) {}

  async get(key: string): Promise<string | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const ttlMs = Math.max(0, ttlSeconds) * 1000;
    if (ttlMs === 0) return;

    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });

    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done === true) break;
      this.entries.delete(oldest.value);
    }
  }

  async del(key: string): Promise<void> {
    this.entries.delete(key);
  }

  get size(): number {
    return this.entries.size;
  }
}

/** Cache key built from a path plus stable, sorted params (never the API key). */
export function cacheKey(namespace: string, path: string, params: Record<string, string>): string {
  const query = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return query.length > 0 ? `${namespace}:${path}?${query}` : `${namespace}:${path}`;
}
