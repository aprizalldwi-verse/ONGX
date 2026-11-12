import type {
  BrowseFilters,
  CatalogAdapter,
  Kind,
  NormalizedGenre,
  NormalizedTitle,
  Page,
  RawOffer,
} from "@ongx/shared";

import { genreFromSlug, genresFromApi } from "../genres";
import { TMDB_TTL, TmdbClient, TmdbError, type TmdbClientOptions } from "./client";
import {
  normalizeMovieDetail,
  normalizeMovieListItem,
  normalizeOffers,
  normalizeSearchItem,
  normalizeTvDetail,
  normalizeTvListItem,
} from "./normalize";
import {
  tmdbGenreListSchema,
  tmdbMovieDetailSchema,
  tmdbMoviePageSchema,
  tmdbSearchPageSchema,
  tmdbTvDetailSchema,
  tmdbTvPageSchema,
  tmdbWatchProvidersSchema,
} from "./schemas";

export type TmdbMediaType = "movie" | "tv";

export interface TmdbAdapterOptions extends TmdbClientOptions {
  /** ISO-3166-1 region used for certifications and provider offers. */
  region?: string | undefined;
}

function mediaTypeOf(kind: Kind): TmdbMediaType {
  if (kind === "MOVIE") return "movie";
  if (kind === "SERIES") return "tv";

  throw new TmdbError("client", "TMDB has no episode-level trending/listing endpoints");
}

function sortParam(kind: Kind, sort: BrowseFilters["sort"]): string {
  switch (sort) {
    case "rating":
      return "vote_average.desc";
    case "newest":
      return kind === "MOVIE" ? "primary_release_date.desc" : "first_air_date.desc";
    case "popularity":
    default:
      return "popularity.desc";
  }
}

interface RemoteRef {
  type: TmdbMediaType | undefined;
  id: string;
}

/** Accepts `movie:123`, `tv:123` or a bare id (resolved by trying movie, then TV). */
export function parseRemoteRef(remoteId: string): RemoteRef {
  const match = /^(movie|tv):(\d+)$/.exec(remoteId.trim());
  if (match?.[1] && match[2]) {
    return { type: match[1] === "tv" ? "tv" : "movie", id: match[2] };
  }

  return { type: undefined, id: remoteId.trim() };
}

export class TmdbAdapter implements CatalogAdapter {
  readonly source = "TMDB" as const;

  private readonly client: TmdbClient;
  private readonly region: string;

  constructor(options: TmdbAdapterOptions = {}) {
    this.client = new TmdbClient(options);
    this.region = (options.region ?? "ID").toUpperCase();
  }

  async trending(kind: Kind, page: number): Promise<Page<NormalizedTitle>> {
    const media = mediaTypeOf(kind);
    const safePage = Math.max(1, Math.trunc(page));

    if (media === "movie") {
      const data = await this.client.get(
        `/trending/movie/week`,
        { page: safePage },
        tmdbMoviePageSchema,
        TMDB_TTL.listing,
      );

      return {
        items: data.results.map(normalizeMovieListItem),
        page: data.page,
        totalPages: Math.min(data.total_pages, 500),
        totalItems: data.total_results,
      };
    }

    const data = await this.client.get(
      `/trending/tv/week`,
      { page: safePage },
      tmdbTvPageSchema,
      TMDB_TTL.listing,
    );

    return {
      items: data.results.map(normalizeTvListItem),
      page: data.page,
      totalPages: Math.min(data.total_pages, 500),
      totalItems: data.total_results,
    };
  }

  async listing(kind: Kind, filters: BrowseFilters, page: number): Promise<Page<NormalizedTitle>> {
    const media = mediaTypeOf(kind);
    const safePage = Math.max(1, Math.trunc(page));
    const genre = filters.genre ? genreFromSlug(filters.genre) : undefined;
    const sort = sortParam(kind, filters.sort);

    const params: Record<string, string | number | boolean> = {
      page: safePage,
      sort_by: sort,
      include_adult: false,
    };

    if (genre?.tmdbId !== undefined) params.with_genres = genre.tmdbId;
    if (filters.year !== undefined) {
      params[media === "movie" ? "primary_release_year" : "first_air_date_year"] = filters.year;
    }
    if (filters.sort === "rating") params["vote_count.gte"] = 200;

    if (media === "movie") {
      const data = await this.client.get(
        `/discover/movie`,
        params,
        tmdbMoviePageSchema,
        TMDB_TTL.listing,
      );

      return {
        items: data.results.map(normalizeMovieListItem),
        page: data.page,
        totalPages: Math.min(data.total_pages, 500),
        totalItems: data.total_results,
      };
    }

    const data = await this.client.get(`/discover/tv`, params, tmdbTvPageSchema, TMDB_TTL.listing);

    return {
      items: data.results.map(normalizeTvListItem),
      page: data.page,
      totalPages: Math.min(data.total_pages, 500),
      totalItems: data.total_results,
    };
  }

  async detail(remoteId: string): Promise<NormalizedTitle> {
    const ref = parseRemoteRef(remoteId);

    if (ref.type === "movie") return this.movieDetail(ref.id);
    if (ref.type === "tv") return this.tvDetail(ref.id);

    try {
      return await this.movieDetail(ref.id);
    } catch (error) {
      if (error instanceof TmdbError && error.kind === "not_found") {
        return this.tvDetail(ref.id);
      }
      throw error;
    }
  }

  async search(query: string, page: number): Promise<Page<NormalizedTitle>> {
    const safePage = Math.max(1, Math.trunc(page));
    const data = await this.client.get(
      `/search/multi`,
      { query: query.trim(), page: safePage, include_adult: false },
      tmdbSearchPageSchema,
      TMDB_TTL.listing,
    );

    const items = data.results
      .map(normalizeSearchItem)
      .filter((item): item is NormalizedTitle => item !== undefined);

    return {
      items,
      page: data.page,
      totalPages: Math.min(data.total_pages, 500),
      totalItems: data.total_results,
    };
  }

  async genres(): Promise<NormalizedGenre[]> {
    const [movies, tv] = await Promise.all([
      this.client.get(`/genre/movie/list`, {}, tmdbGenreListSchema, TMDB_TTL.genres),
      this.client.get(`/genre/tv/list`, {}, tmdbGenreListSchema, TMDB_TTL.genres),
    ]);

    return genresFromApi([...movies.genres, ...tv.genres]);
  }

  async offers(remoteId: string, region: string): Promise<RawOffer[]> {
    const ref = parseRemoteRef(remoteId);
    const iso = (region || this.region).toUpperCase();

    if (ref.type === "movie") return this.movieOffers(ref.id, iso);
    if (ref.type === "tv") return this.tvOffers(ref.id, iso);

    try {
      return await this.movieOffers(ref.id, iso);
    } catch (error) {
      if (error instanceof TmdbError && error.kind === "not_found") {
        return this.tvOffers(ref.id, iso);
      }
      throw error;
    }
  }

  private async movieDetail(id: string): Promise<NormalizedTitle> {
    const data = await this.client.get(
      `/movie/${id}`,
      { append_to_response: "alternative_titles,credits,videos,release_dates" },
      tmdbMovieDetailSchema,
      TMDB_TTL.detail,
    );

    return normalizeMovieDetail(data, this.region);
  }

  private async tvDetail(id: string): Promise<NormalizedTitle> {
    const data = await this.client.get(
      `/tv/${id}`,
      { append_to_response: "alternative_titles,credits,videos,content_ratings" },
      tmdbTvDetailSchema,
      TMDB_TTL.detail,
    );

    return normalizeTvDetail(data, this.region);
  }

  private async movieOffers(id: string, region: string): Promise<RawOffer[]> {
    const data = await this.client.get(
      `/movie/${id}/watch/providers`,
      {},
      tmdbWatchProvidersSchema,
      TMDB_TTL.detail,
    );

    return normalizeOffers(data, region);
  }

  private async tvOffers(id: string, region: string): Promise<RawOffer[]> {
    const data = await this.client.get(
      `/tv/${id}/watch/providers`,
      {},
      tmdbWatchProvidersSchema,
      TMDB_TTL.detail,
    );

    return normalizeOffers(data, region);
  }
}
