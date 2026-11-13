import { NextResponse } from "next/server";

import { getRedisCache } from "@/lib/redis-cache";
import {
  searchCacheKey,
  searchQuerySchema,
  searchResponseSchema,
  toSearchResponse,
  SEARCH_CACHE_TTL_SEC,
} from "@/lib/search";
import { checkSearchLimit } from "@/lib/search-rate-limit";
import { searchTitles } from "@/lib/titles/queries";

export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first && first.length > 0 ? first : (request.headers.get("x-real-ip") ?? "unknown");
}

function parseCached(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const NO_STORE = { "cache-control": "no-store" } as const;

/**
 * Typeahead endpoint. Query validation happens before the rate limit so a
 * malformed request never consumes a slot. Results are cached in Redis for a
 * minute per locale; the browser is told not to cache so the typeahead always
 * reflects the current catalog.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = searchQuerySchema.safeParse({ q: url.searchParams.get("q") ?? "" });

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
  }

  const limit = await checkSearchLimit(clientIp(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { ...NO_STORE, "retry-after": String(limit.retryAfterSec) },
      },
    );
  }

  const locale = url.searchParams.get("locale") === "en" ? "en" : "id";
  const cache = getRedisCache();
  const key = searchCacheKey(parsed.data.q, locale);

  if (cache) {
    const cached = await cache.get(key);
    if (cached !== null) {
      const body = searchResponseSchema.safeParse(parseCached(cached));
      if (body.success) {
        return NextResponse.json(body.data, { headers: { ...NO_STORE, "x-cache": "hit" } });
      }
    }
  }

  const items = await searchTitles(parsed.data.q, locale);
  const body = toSearchResponse(parsed.data.q, items);
  if (cache) await cache.set(key, JSON.stringify(body), SEARCH_CACHE_TTL_SEC);

  return NextResponse.json(body, { headers: { ...NO_STORE, "x-cache": "miss" } });
}
