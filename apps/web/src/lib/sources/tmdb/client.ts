import type { z } from "zod";

import { cacheKey, MemoryCache, type CacheStore } from "@/lib/cache";
import { noopRateLimiter, RateLimitExceeded, type RateLimiter } from "@/lib/rate-limit";

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";

/** Cache TTLs from the plan: listings 10 min, details 30 min, genres 24 h. */
export const TMDB_TTL = {
  listing: 600,
  detail: 1_800,
  genres: 86_400,
} as const;

export const TMDB_RATE_LIMIT = {
  limit: 40,
  windowMs: 10_000,
} as const;

export type TmdbErrorKind =
  "config" | "not_found" | "rate_limited" | "server" | "client" | "network" | "parse";

export class TmdbError extends Error {
  readonly kind: TmdbErrorKind;
  readonly status: number | undefined;
  readonly retryAfterMs: number | undefined;
  readonly retryable: boolean;

  constructor(
    kind: TmdbErrorKind,
    message: string,
    options: {
      status?: number | undefined;
      retryAfterMs?: number | undefined;
      cause?: unknown;
    } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "TmdbError";
    this.kind = kind;
    this.status = options.status;
    this.retryAfterMs = options.retryAfterMs;
    this.retryable = kind === "rate_limited" || kind === "server" || kind === "network";
  }
}

export interface TmdbClientOptions {
  apiKey?: string | undefined;
  /** TMDB language tag; Indonesian-first, English is resolved via alternative titles. */
  language?: string | undefined;
  baseUrl?: string | undefined;
  fetchImpl?: typeof fetch | undefined;
  cache?: CacheStore | undefined;
  limiter?: RateLimiter | undefined;
  sleep?: ((ms: number) => Promise<void>) | undefined;
  random?: (() => number) | undefined;
  maxAttempts?: number | undefined;
  retryBaseMs?: number | undefined;
  timeoutMs?: number | undefined;
}

type QueryValue = string | number | boolean | undefined;
type QueryParams = Record<string, QueryValue>;

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function toError(error: unknown): TmdbError {
  if (error instanceof TmdbError) return error;
  if (error instanceof RateLimitExceeded) {
    return new TmdbError("rate_limited", error.message, { retryAfterMs: error.retryAfterMs });
  }
  const message = error instanceof Error ? error.message : "Unknown TMDB error";
  return new TmdbError("network", message, { cause: error });
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number.parseFloat(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1_000);
  return undefined;
}

/**
 * Thin, typed TMDB v3 client:
 * - shared Redis rate limiter (injected) before every request
 * - read-through cache (injected) with per-call TTL
 * - retries on 429/5xx/network with exponential backoff + jitter
 * - Zod-validated responses; nothing unvalidated leaves this class
 */
export class TmdbClient {
  private readonly apiKey: string | undefined;
  private readonly language: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly cache: CacheStore;
  private readonly limiter: RateLimiter;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;
  private readonly maxAttempts: number;
  private readonly retryBaseMs: number;
  private readonly timeoutMs: number;

  constructor(options: TmdbClientOptions = {}) {
    this.apiKey = options.apiKey?.trim() || undefined;
    this.language = options.language ?? "id-ID";
    this.baseUrl = (options.baseUrl ?? TMDB_BASE_URL).replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.cache = options.cache ?? new MemoryCache();
    this.limiter = options.limiter ?? noopRateLimiter;
    this.sleep = options.sleep ?? defaultSleep;
    this.random = options.random ?? Math.random;
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 3);
    this.retryBaseMs = Math.max(1, options.retryBaseMs ?? 400);
    this.timeoutMs = Math.max(1_000, options.timeoutMs ?? 10_000);
  }

  /** GET + validate + cache. `params` never include the API key. */
  async get<T>(
    path: string,
    params: QueryParams,
    schema: z.ZodType<T>,
    ttlSeconds: number,
  ): Promise<T> {
    if (!this.apiKey) {
      throw new TmdbError(
        "config",
        "TMDB_API_KEY is not configured. Set it in apps/web/.env.local to use the catalog adapter.",
      );
    }

    const normalized = this.normalizeParams(params);
    const key = cacheKey("tmdb:v1", path, normalized);
    const cached = await this.cache.get(key);
    if (cached) {
      const parsed = this.parse(cached, schema);
      if (parsed !== undefined) return parsed;
    }

    const url = this.buildUrl(path, normalized);
    let lastError: TmdbError | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        await this.limiter.acquire();
        const response = await this.fetchImpl(url, {
          headers: this.headers(),
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (response.status === 404) {
          throw new TmdbError("not_found", `TMDB resource not found: ${path}`, { status: 404 });
        }

        if (response.status === 401 || response.status === 403) {
          throw new TmdbError(
            "config",
            `TMDB rejected TMDB_API_KEY (HTTP ${response.status}). Check the key and its permissions.`,
            { status: response.status },
          );
        }

        if (response.status === 429 || response.status >= 500) {
          throw new TmdbError("server", `TMDB responded with HTTP ${response.status}`, {
            status: response.status,
            retryAfterMs: parseRetryAfter(response.headers.get("retry-after")),
          });
        }

        if (!response.ok) {
          throw new TmdbError("client", `TMDB responded with HTTP ${response.status}`, {
            status: response.status,
          });
        }

        const body: unknown = await response.json();
        const result = schema.safeParse(body);
        if (!result.success) {
          throw new TmdbError("parse", `Unexpected TMDB payload for ${path}`, {
            cause: result.error,
          });
        }

        await this.cache.set(key, JSON.stringify(result.data), ttlSeconds);
        return result.data;
      } catch (error) {
        const mapped = toError(error);
        lastError = mapped;

        if (!mapped.retryable || attempt === this.maxAttempts) throw mapped;

        const backoff = this.retryBaseMs * 2 ** (attempt - 1);
        const jitter = Math.round(this.random() * this.retryBaseMs);
        await this.sleep(mapped.retryAfterMs ?? backoff + jitter);
      }
    }

    throw lastError ?? new TmdbError("network", "TMDB request failed");
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { accept: "application/json" };
    // v4 read tokens are JWTs and must go in the Authorization header.
    if (this.apiKey?.startsWith("eyJ")) headers.authorization = `Bearer ${this.apiKey}`;
    return headers;
  }

  private normalizeParams(params: QueryParams): Record<string, string> {
    const result: Record<string, string> = { language: this.language };

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      result[key] = String(value);
    }

    return result;
  }

  private buildUrl(path: string, params: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    if (this.apiKey && !this.apiKey.startsWith("eyJ")) url.searchParams.set("api_key", this.apiKey);
    return url.toString();
  }

  private parse<T>(raw: string, schema: z.ZodType<T>): T | undefined {
    try {
      const result = schema.safeParse(JSON.parse(raw));
      return result.success ? result.data : undefined;
    } catch {
      return undefined;
    }
  }
}

export function isRateLimitError(error: unknown): boolean {
  return error instanceof RateLimitExceeded;
}
