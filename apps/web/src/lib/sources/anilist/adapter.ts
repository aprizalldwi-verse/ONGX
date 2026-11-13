import type {
  BrowseFilters,
  CatalogAdapter,
  Kind,
  NormalizedEpisode,
  NormalizedGenre,
  NormalizedTitle,
  Page,
  RawOffer,
} from "@ongx/shared";

import { ANILIST_TTL, AniListClient, AniListError, type AniListClientOptions } from "./client";
import { anilistGenreName, genreFromAniListName } from "./genres";
import {
  normalizeAniListDetail,
  normalizeAniListEpisodes,
  normalizeAniListMedia,
} from "./normalize";
import {
  anilistEpisodesResponseSchema,
  anilistGenresResponseSchema,
  anilistMediaDetailResponseSchema,
  anilistMediaPageResponseSchema,
  anilistRelatedResponseSchema,
} from "./schemas";

const PAGE_SIZE = 20;

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  description
  coverImage { extraLarge large color }
  bannerImage
  format
  status
  seasonYear
  startDate { year month day }
  episodes
  duration
  averageScore
  popularity
  genres
  isAdult
  countryOfOrigin
  trailer { id site }
`;

const PAGE_QUERY = `
  query Page($page: Int, $perPage: Int, $sort: [MediaSort], $genre: String, $seasonYear: Int, $search: String, $format: MediaFormat) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { currentPage lastPage total hasNextPage }
      media(type: ANIME, isAdult: false, sort: $sort, genre: $genre, seasonYear: $seasonYear, search: $search, format: $format) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

const DETAIL_QUERY = `
  query Detail($id: Int) {
    Media(id: $id, type: ANIME) {
      ${MEDIA_FIELDS}
      recommendations(perPage: 12, sort: RATING_DESC) {
        nodes { mediaRecommendation { ${MEDIA_FIELDS} } }
      }
      streamingEpisodes { title thumbnail url site }
      externalLinks { id url site type language isDisabled }
      staff(perPage: 10, sort: RELEVANCE) {
        edges { role node { id name { full } image { large } } }
      }
    }
  }
`;

const RELATED_QUERY = `
  query Related($id: Int, $perPage: Int) {
    Media(id: $id, type: ANIME) {
      recommendations(perPage: $perPage, sort: RATING_DESC) {
        nodes { mediaRecommendation { ${MEDIA_FIELDS} } }
      }
    }
  }
`;

const EPISODES_QUERY = `
  query Episodes($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes
      duration
      streamingEpisodes { title thumbnail url site }
    }
  }
`;

const GENRES_QUERY = `
  query Genres {
    GenreCollection
  }
`;

/** Accepts `123`, `anilist:123` and trims stray whitespace. */
export function parseAniListId(remoteId: string): number {
  const match = /(\d+)/.exec(remoteId.trim());
  const id = match?.[1] ? Number.parseInt(match[1], 10) : Number.NaN;

  if (!Number.isFinite(id) || id <= 0) {
    throw new AniListError("client", `Invalid AniList id: ${remoteId}`);
  }

  return id;
}

function sortFor(sort: BrowseFilters["sort"]): string {
  switch (sort) {
    case "rating":
      return "SCORE_DESC";
    case "newest":
      return "START_DATE_DESC";
    case "popularity":
    default:
      return "POPULARITY_DESC";
  }
}

export class AniListAdapter implements CatalogAdapter {
  readonly source = "ANILIST" as const;

  private readonly client: AniListClient;

  constructor(options: AniListClientOptions = {}) {
    this.client = new AniListClient(options);
  }

  async trending(kind: Kind, page: number): Promise<Page<NormalizedTitle>> {
    const safePage = Math.max(1, Math.trunc(page));

    return this.fetchPage(safePage, {
      sort: ["TRENDING_DESC"],
      ...(kind === "MOVIE" ? { format: "MOVIE" } : {}),
    });
  }

  async listing(kind: Kind, filters: BrowseFilters, page: number): Promise<Page<NormalizedTitle>> {
    const safePage = Math.max(1, Math.trunc(page));
    const genre = filters.genre ? anilistGenreName(filters.genre) : undefined;

    return this.fetchPage(safePage, {
      sort: [sortFor(filters.sort)],
      ...(genre !== undefined ? { genre } : {}),
      ...(filters.year !== undefined ? { seasonYear: filters.year } : {}),
      ...(kind === "MOVIE" ? { format: "MOVIE" } : {}),
    });
  }

  async detail(remoteId: string): Promise<NormalizedTitle> {
    const data = await this.client.request(
      "Detail",
      DETAIL_QUERY,
      { id: parseAniListId(remoteId) },
      anilistMediaDetailResponseSchema,
      ANILIST_TTL.detail,
    );

    if (!data.data.Media) {
      throw new AniListError("not_found", `AniList media not found: ${remoteId}`);
    }

    return normalizeAniListDetail(data.data.Media);
  }

  async search(query: string, page: number): Promise<Page<NormalizedTitle>> {
    const search = query.trim();
    if (search.length === 0) {
      return { items: [], page: 1, totalPages: 1, totalItems: 0 };
    }

    return this.fetchPage(Math.max(1, Math.trunc(page)), {
      search,
      sort: ["SEARCH_MATCH"],
    });
  }

  async genres(): Promise<NormalizedGenre[]> {
    const data = await this.client.request(
      "Genres",
      GENRES_QUERY,
      {},
      anilistGenresResponseSchema,
      ANILIST_TTL.genres,
    );

    return data.data.GenreCollection.map(genreFromAniListName);
  }

  async offers(_remoteId: string, _region: string): Promise<RawOffer[]> {
    // AniList has no region-aware legal availability data. Official streaming
    // links are already part of `detail()` (see ASUMSI-034), so a second request
    // would only duplicate them.
    return [];
  }

  async related(remoteId: string, limit = 12): Promise<NormalizedTitle[]> {
    const id = parseAniListId(remoteId);
    const perPage = Math.min(25, Math.max(1, Math.trunc(limit)));
    const data = await this.client.request(
      "Related",
      RELATED_QUERY,
      { id, perPage },
      anilistRelatedResponseSchema,
      ANILIST_TTL.detail,
    );

    if (!data.data.Media) {
      throw new AniListError("not_found", `AniList media not found: ${remoteId}`);
    }

    return (data.data.Media.recommendations?.nodes ?? [])
      .flatMap((node) => (node.mediaRecommendation ? [node.mediaRecommendation] : []))
      .slice(0, limit)
      .map(normalizeAniListMedia);
  }

  async episodes(remoteId: string, season = 1): Promise<NormalizedEpisode[]> {
    if (season !== 1) return [];

    const data = await this.client.request(
      "Episodes",
      EPISODES_QUERY,
      { id: parseAniListId(remoteId) },
      anilistEpisodesResponseSchema,
      ANILIST_TTL.detail,
    );

    if (!data.data.Media) {
      throw new AniListError("not_found", `AniList media not found: ${remoteId}`);
    }

    return normalizeAniListEpisodes(data.data.Media, season);
  }

  private async fetchPage(
    page: number,
    variables: {
      sort: string[];
      genre?: string;
      seasonYear?: number;
      search?: string;
      format?: string;
    },
  ): Promise<Page<NormalizedTitle>> {
    const data = await this.client.request(
      "Page",
      PAGE_QUERY,
      { page, perPage: PAGE_SIZE, ...variables },
      anilistMediaPageResponseSchema,
      ANILIST_TTL.listing,
    );

    const result = data.data.Page;

    return {
      items: result.media.map(normalizeAniListMedia),
      page: result.pageInfo.currentPage,
      totalPages: Math.max(1, Math.min(result.pageInfo.lastPage, 500)),
      totalItems: result.pageInfo.total,
    };
  }
}
