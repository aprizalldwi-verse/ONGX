import type {
  Kind,
  NormalizedEpisode,
  NormalizedGenre,
  NormalizedOffer,
  NormalizedTitle,
  Page,
  Source,
} from "./types";

export type BrowseSort = "popularity" | "rating" | "newest";

export interface BrowseFilters {
  /** Genre slug (our canonical slug, not the TMDB id). */
  genre?: string | undefined;
  year?: number | undefined;
  sort?: BrowseSort | undefined;
  /** ISO-3166-1 alpha-2 region used for provider offers. */
  region?: string | undefined;
}

export type RawOffer = NormalizedOffer;

/**
 * Contract every catalog source implements. Phase 3 ships TMDB; Phase 4 adds
 * AniList behind the same surface, and Phase 5+ only talks to this interface.
 */
export interface CatalogAdapter {
  readonly source: Source;
  trending(kind: Kind, page: number): Promise<Page<NormalizedTitle>>;
  listing(kind: Kind, filters: BrowseFilters, page: number): Promise<Page<NormalizedTitle>>;
  detail(remoteId: string): Promise<NormalizedTitle>;
  search(query: string, page: number): Promise<Page<NormalizedTitle>>;
  genres(): Promise<NormalizedGenre[]>;
  offers(remoteId: string, region: string): Promise<RawOffer[]>;
  /** Source-recommended titles; optional because not every source exposes one. */
  related?(remoteId: string, limit?: number): Promise<NormalizedTitle[]>;
  /** Episode metadata for one season; omitted by sources without episode data. */
  episodes?(remoteId: string, season: number): Promise<NormalizedEpisode[]>;
}
