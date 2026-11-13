import { z } from "zod";

import type { TitleCardView } from "@/lib/titles/view";

/**
 * Search contract shared by the API route, the Redis cache and the client.
 * Nothing here imports Prisma or `server-only`, so the normalization and the
 * wire schema are unit testable.
 */

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 80;
export const SEARCH_LIMIT = 24;

/** Short TTL: the catalog changes slowly, but search should not feel stale. */
export const SEARCH_CACHE_TTL_SEC = 60;

export const SEARCH_RATE_LIMIT = 120;
export const SEARCH_RATE_WINDOW_SEC = 60;

export const searchQuerySchema = z
  .object({
    q: z.string().trim().min(SEARCH_MIN_LENGTH).max(SEARCH_MAX_LENGTH),
  })
  .strict();

export type SearchQuery = z.infer<typeof searchQuerySchema>;

/**
 * Mirrors `TitleCardView`. The API only ever emits cards, and parsing the cached
 * JSON through this schema keeps a corrupt cache entry from reaching the client.
 */
export const searchItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  href: z.string(),
  watchHref: z.string(),
  title: z.string(),
  titleSecondary: z.string().optional(),
  posterUrl: z.string().optional(),
  year: z.number().optional(),
  rating: z.number().optional(),
  kind: z.enum(["MOVIE", "SERIES"]),
  source: z.enum(["TMDB", "ANILIST", "OWN"]),
  trailerKey: z.string().optional(),
  availableOnVidio: z.boolean(),
});

export const searchResponseSchema = z.object({
  query: z.string(),
  items: z.array(searchItemSchema),
});

export type SearchItem = z.infer<typeof searchItemSchema>;

export interface SearchResponse {
  query: string;
  items: SearchItem[];
}

/** Collapses whitespace so `one   piece` and ` one piece ` share a cache key. */
export function normalizeSearchQuery(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX_LENGTH);
}

export function isSearchable(raw: string): boolean {
  return normalizeSearchQuery(raw).length >= SEARCH_MIN_LENGTH;
}

/** Case-insensitive matching means the cache key must be case-insensitive too. */
export function searchCacheKey(query: string, locale: string): string {
  return `ongx:search:v1:${locale}:${normalizeSearchQuery(query).toLowerCase()}`;
}

export function toSearchResponse(query: string, items: TitleCardView[]): SearchResponse {
  return { query: normalizeSearchQuery(query), items };
}
