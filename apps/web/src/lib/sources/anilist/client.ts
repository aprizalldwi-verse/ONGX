import type { z } from "zod";

import { cacheKey, MemoryCache, type CacheStore } from "@/lib/cache";
import { noopRateLimiter, RateLimitExceeded, type RateLimiter } from "@/lib/rate-limit";

import { anilistGraphqlErrorSchema } from "./schemas";

export const ANILIST_ENDPOINT = "https://graphql.anilist.co";

/** Cache TTLs mirror TMDB: listings 10 min, details 30 min, genres 24 h. */
export const ANILIST_TTL = {
  listing: 600,
  detail: 1_800,
  genres: 86_400,
} as const;

/** AniList allows 90 requests per minute per IP. */
export const ANILIST_RATE_LIMIT = {
  limit: 90,
  windowMs: 60_000,
} as const;

export type AniListErrorKind =
  "not_found" | "rate_limited" | "server" | "client" | "network" | "parse";

export class AniListError extends Error {
  readonly kind: AniListErrorKind;
  readonly status: number | undefined;
  readonly retryAfterMs: number | undefined;
  readonly retryable: boolean;

  constructor(
    kind: AniListErrorKind,
    message: string,
    options: {
      status?: number | undefined;
      retryAfterMs?: number | undefined;
      cause?: unknown;
    } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AniListError";
    this.kind = kind;
    this.status = options.status;
    this.retryAfterMs = options.retryAfterMs;
    this.retryable = kind === "rate_limited" || kind === "server" || kind === "network";
  }
}

export interface AniListClientOptions {
  endpoint?: string | undefined;
  fetchImpl?: typeof fetch | undefined;
  cache?: CacheStore | undefined;
  limiter?: RateLimiter | undefined;
  sleep?: ((ms: number) => Promise<void>) | undefined;
  random?: (() => number) | undefined;
  maxAttempts?: number | undefined;
  retryBaseMs?: number | undefined;
  timeoutMs?: number | undefined;
}

type QueryVariables = Record<string, unknown>;

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function toError(error: unknown): AniListError {
  if (error instanceof AniListError) return error;
  if (error instanceof RateLimitExceeded) {
    return new AniListError("rate_limited", error.message, { retryAfterMs: error.retryAfterMs });
  }
  const message = error instanceof Error ? error.message : "Unknown AniList error";
  return new AniListError("network", message, { cause: error });
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number.parseFloat(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1_000);
  return undefined;
}

/** Reads the `errors[]` array without trusting the rest of the payload. */
export function graphqlErrors(body: unknown): { message: string; status?: number | undefined }[] {
  if (typeof body !== "object" || body === null) return [];
  const errors = (body as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) return [];

  return errors.flatMap((entry) => {
    const parsed = anilistGraphqlErrorSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

function variablesKey(variables: QueryVariables): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(variables)) {
    if (value === undefined) continue;
    result[key] = JSON.stringify(value);
  }

  return result;
}

/**
 * Typed AniList GraphQL client:
 * - shared Redis rate limiter (90 req / 60 s) before every request
 * - read-through cache with per-call TTL
 * - retries on 429/5xx/network with exponential backoff + jitter
 * - Zod-validated responses; GraphQL errors are mapped to typed errors
 */
export class AniListClient {
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;
  private readonly cache: CacheStore;
  private readonly limiter: RateLimiter;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;
  private readonly maxAttempts: number;
  private readonly retryBaseMs: number;
  private readonly timeoutMs: number;

  constructor(options: AniListClientOptions = {}) {
    this.endpoint = options.endpoint ?? ANILIST_ENDPOINT;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.cache = options.cache ?? new MemoryCache();
    this.limiter = options.limiter ?? noopRateLimiter;
    this.sleep = options.sleep ?? defaultSleep;
    this.random = options.random ?? Math.random;
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 3);
    this.retryBaseMs = Math.max(1, options.retryBaseMs ?? 600);
    this.timeoutMs = Math.max(1_000, options.timeoutMs ?? 12_000);
  }

  /** POST a GraphQL operation, validate it with `schema` and cache the result. */
  async request<T>(
    name: string,
    query: string,
    variables: QueryVariables,
    schema: z.ZodType<T>,
    ttlSeconds: number,
  ): Promise<T> {
    const key = cacheKey("anilist:v1", name, variablesKey(variables));
    const cached = await this.cache.get(key);
    if (cached) {
      const parsed = this.parse(cached, schema);
      if (parsed !== undefined) return parsed;
    }

    let lastError: AniListError | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        await this.limiter.acquire();
        const response = await this.fetchImpl(this.endpoint, {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({ query, variables }),
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (response.status === 404) {
          throw new AniListError("not_found", `AniList resource not found: ${name}`, {
            status: 404,
          });
        }

        if (response.status === 429 || response.status >= 500) {
          throw new AniListError("server", `AniList responded with HTTP ${response.status}`, {
            status: response.status,
            retryAfterMs: parseRetryAfter(response.headers.get("retry-after")),
          });
        }

        if (!response.ok) {
          throw new AniListError("client", `AniList responded with HTTP ${response.status}`, {
            status: response.status,
          });
        }

        let body: unknown;
        try {
          body = await response.json();
        } catch (error) {
          throw new AniListError("parse", `AniList returned invalid JSON for ${name}`, {
            cause: error,
          });
        }

        const errors = graphqlErrors(body);
        if (errors.length > 0) {
          const notFound = errors.some(
            (error) => error.status === 404 || error.message.toLowerCase().includes("not found"),
          );

          throw new AniListError(
            notFound ? "not_found" : "client",
            notFound
              ? `AniList resource not found: ${name}`
              : (errors[0]?.message ?? `AniList rejected the query: ${name}`),
          );
        }

        const result = schema.safeParse(body);
        if (!result.success) {
          throw new AniListError("parse", `Unexpected AniList payload for ${name}`, {
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

    throw lastError ?? new AniListError("network", "AniList request failed");
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
