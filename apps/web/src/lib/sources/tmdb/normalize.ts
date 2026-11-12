import {
  buildTitleSlug,
  slugify,
  type NormalizedOffer,
  type NormalizedPerson,
  type NormalizedTitle,
  type OfferType,
} from "@ongx/shared";

import { genresFromApi, genresFromIds } from "../genres";
import type {
  TmdbMovieDetail,
  TmdbMovieListItem,
  TmdbProvider,
  TmdbSearchItem,
  TmdbTvDetail,
  TmdbTvListItem,
  TmdbWatchProviders,
} from "./schemas";

const CAST_LIMIT = 15;
const CREW_LIMIT = 6;
const CREW_JOBS = new Set(["Director", "Writer", "Screenplay", "Story"]);

function text(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function yearFromDate(value: string | undefined): number | undefined {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(value?.trim() ?? "");
  if (!match?.[1]) return undefined;
  const year = Number.parseInt(match[1], 10);
  return Number.isFinite(year) ? year : undefined;
}

function ratingOf(value: number | null | undefined): number | undefined {
  return typeof value === "number" && value > 0 ? value : undefined;
}

function countOf(value: number | null | undefined): number | undefined {
  return typeof value === "number" && value >= 0 ? Math.trunc(value) : undefined;
}

function durationOf(seconds: number | null | undefined): number | undefined {
  return typeof seconds === "number" && seconds > 0 ? Math.trunc(seconds) : undefined;
}

/** Pick the first YouTube trailer, preferring official uploads. */
export function pickTrailerKey(
  videos: { key: string; site: string; type: string; official?: boolean | undefined }[] | undefined,
): string | undefined {
  if (!videos || videos.length === 0) return undefined;

  const trailers = videos.filter((video) => video.site === "YouTube" && video.type === "Trailer");
  const official = trailers.find((video) => video.official === true);
  return official?.key ?? trailers[0]?.key;
}

/**
 * Movie certifications come from `release_dates`; TV ratings from
 * `content_ratings`. Prefer the configured region, then the US, then anything.
 */
export function pickAgeRating(
  entries: { region: string; value: string | undefined }[],
  preferred: string[],
): string | undefined {
  for (const region of preferred) {
    const match = entries.find((entry) => entry.region === region);
    const value = text(match?.value);
    if (value && value !== "NR" && value !== "0") return value;
  }

  for (const entry of entries) {
    const value = text(entry.value);
    if (value && value !== "NR" && value !== "0") return value;
  }

  return undefined;
}

function movieCertification(detail: TmdbMovieDetail, region: string): string | undefined {
  const entries = (detail.release_dates?.results ?? []).map((item) => ({
    region: item.iso_3166_1,
    value: item.release_dates.find((entry) => text(entry.certification))?.certification,
  }));

  return pickAgeRating(entries, [region, "ID", "US"]);
}

function tvCertification(detail: TmdbTvDetail, region: string): string | undefined {
  const entries = (detail.content_ratings?.results ?? []).map((item) => ({
    region: item.iso_3166_1,
    value: item.rating,
  }));

  return pickAgeRating(entries, [region, "ID", "US"]);
}

interface AlternateTitles {
  titles: { iso_3166_1: string; title: string }[];
}

function alternateTitle(
  alternatives: AlternateTitles | undefined,
  region: string,
): string | undefined {
  return text(alternatives?.titles.find((entry) => entry.iso_3166_1 === region)?.title);
}

function castPeople(
  cast: {
    id: number;
    name: string;
    profile_path?: string | null | undefined;
    character?: string | undefined;
    order?: number | undefined;
  }[],
): NormalizedPerson[] {
  return [...cast]
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    .slice(0, CAST_LIMIT)
    .map((person, index) => ({
      slug: slugify(person.name),
      name: person.name,
      imagePath: person.profile_path ?? undefined,
      tmdbId: person.id,
      role: "CAST",
      label: text(person.character),
      position: index,
    }));
}

function crewPeople(
  crew: {
    id: number;
    name: string;
    profile_path?: string | null | undefined;
    job?: string | undefined;
  }[],
): NormalizedPerson[] {
  return crew
    .filter((person) => person.job !== undefined && CREW_JOBS.has(person.job))
    .slice(0, CREW_LIMIT)
    .map((person, index) => ({
      slug: slugify(person.name),
      name: person.name,
      imagePath: person.profile_path ?? undefined,
      tmdbId: person.id,
      role: "CREW",
      label: person.job,
      position: index,
    }));
}

function posterPathOf(value: string | null | undefined): string {
  return text(value ?? undefined) ?? "";
}

type OfferBucketKey = "flatrate" | "free" | "ads" | "rent" | "buy";

const OFFER_BUCKETS: { key: OfferBucketKey; type: OfferType }[] = [
  { key: "flatrate", type: "FLATRATE" },
  { key: "free", type: "FREE" },
  { key: "ads", type: "ADS" },
  { key: "rent", type: "RENT" },
  { key: "buy", type: "BUY" },
];

function offersFromBucket(
  providers: TmdbProvider[] | undefined,
  type: OfferType,
  region: string,
  url: string,
): NormalizedOffer[] {
  return (providers ?? []).map((provider) => ({
    region,
    providerId: String(provider.provider_id),
    providerName: provider.provider_name,
    offerType: type,
    url,
    logoPath: provider.logo_path ?? undefined,
  }));
}

/**
 * TMDB (via JustWatch) only exposes one regional deep link per title, so every
 * provider entry shares it. Offers are dropped when no link is available.
 */
export function normalizeOffers(payload: TmdbWatchProviders, region: string): NormalizedOffer[] {
  const iso = region.toUpperCase();
  const entry = payload.results[iso];
  const url = text(entry?.link);
  if (!entry || !url) return [];

  const seen = new Set<string>();
  const offers: NormalizedOffer[] = [];

  for (const bucket of OFFER_BUCKETS) {
    for (const offer of offersFromBucket(entry[bucket.key], bucket.type, iso, url)) {
      const key = `${offer.providerId}:${offer.offerType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      offers.push(offer);
    }
  }

  return offers;
}

export function normalizeMovieListItem(item: TmdbMovieListItem): NormalizedTitle {
  const year = yearFromDate(item.release_date);
  const original = text(item.original_title);

  return {
    source: "TMDB",
    kind: "MOVIE",
    remoteId: String(item.id),
    slug: buildTitleSlug(text(item.title) ?? original ?? "untitled", year),
    titleId: text(item.title),
    titleEn: item.original_language === "en" ? original : undefined,
    titleNative: original,
    synopsis: text(item.overview),
    year,
    releasedAt: text(item.release_date),
    rating: ratingOf(item.vote_average),
    voteCount: countOf(item.vote_count),
    popularity: item.popularity ?? undefined,
    posterPath: posterPathOf(item.poster_path),
    backdropPath: text(item.backdrop_path ?? undefined),
    language: text(item.original_language),
    genres: genresFromIds(item.genre_ids ?? []),
    people: [],
    offers: [],
  };
}

export function normalizeTvListItem(item: TmdbTvListItem): NormalizedTitle {
  const year = yearFromDate(item.first_air_date);
  const original = text(item.original_name);

  return {
    source: "TMDB",
    kind: "SERIES",
    remoteId: String(item.id),
    slug: buildTitleSlug(text(item.name) ?? original ?? "untitled", year),
    titleId: text(item.name),
    titleEn: item.original_language === "en" ? original : undefined,
    titleNative: original,
    synopsis: text(item.overview),
    year,
    releasedAt: text(item.first_air_date),
    rating: ratingOf(item.vote_average),
    voteCount: countOf(item.vote_count),
    popularity: item.popularity ?? undefined,
    posterPath: posterPathOf(item.poster_path),
    backdropPath: text(item.backdrop_path ?? undefined),
    language: text(item.original_language),
    genres: genresFromIds(item.genre_ids ?? []),
    people: [],
    offers: [],
  };
}

/** Search results mix movies, TV shows and people; people are dropped. */
export function normalizeSearchItem(item: TmdbSearchItem): NormalizedTitle | undefined {
  if (item.media_type === "person") return undefined;

  const isTv =
    item.media_type === "tv" || (item.media_type === undefined && item.name !== undefined);
  const title = isTv ? item.name : item.title;
  const original = isTv ? item.original_name : item.original_title;
  const date = isTv ? item.first_air_date : item.release_date;

  if (!title) return undefined;

  const year = yearFromDate(date);

  return {
    source: "TMDB",
    kind: isTv ? "SERIES" : "MOVIE",
    remoteId: String(item.id),
    slug: buildTitleSlug(text(title) ?? original ?? "untitled", year),
    titleId: text(title),
    titleEn: item.original_language === "en" ? text(original) : undefined,
    titleNative: text(original),
    synopsis: text(item.overview),
    year,
    releasedAt: text(date),
    rating: ratingOf(item.vote_average),
    voteCount: countOf(item.vote_count),
    popularity: item.popularity ?? undefined,
    posterPath: posterPathOf(item.poster_path),
    backdropPath: text(item.backdrop_path ?? undefined),
    language: text(item.original_language),
    genres: genresFromIds(item.genre_ids ?? []),
    people: [],
    offers: [],
  };
}

export function normalizeMovieDetail(detail: TmdbMovieDetail, region: string): NormalizedTitle {
  const base = normalizeMovieListItem(detail);
  // `titleId` is the Indonesian display name (language=id-ID); the original
  // title is kept in `titleNative`, and an explicit ID alternative wins.
  const titleId = alternateTitle(detail.alternative_titles, "ID") ?? base.titleId;
  const titleEn = alternateTitle(detail.alternative_titles, "US");

  return {
    ...base,
    slug: buildTitleSlug(titleId ?? base.titleNative ?? "untitled", base.year),
    ...(titleId !== undefined ? { titleId } : {}),
    ...(titleEn !== undefined ? { titleEn } : {}),
    synopsis: text(detail.overview) ?? base.synopsis,
    durationSec: durationOf(detail.runtime),
    ageRating: movieCertification(detail, region),
    country: text(detail.production_countries?.[0]?.iso_3166_1),
    backdropPath: text(detail.backdrop_path ?? undefined) ?? base.backdropPath,
    trailerKey: pickTrailerKey(detail.videos?.results),
    genres: (detail.genres ?? []).length > 0 ? genresFromApi(detail.genres ?? []) : base.genres,
    people: [...castPeople(detail.credits?.cast ?? []), ...crewPeople(detail.credits?.crew ?? [])],
  };
}

export function normalizeTvDetail(detail: TmdbTvDetail, region: string): NormalizedTitle {
  const base = normalizeTvListItem(detail);
  const titleId = alternateTitle(detail.alternative_titles, "ID") ?? base.titleId;
  const titleEn = alternateTitle(detail.alternative_titles, "US");

  return {
    ...base,
    slug: buildTitleSlug(titleId ?? base.titleNative ?? "untitled", base.year),
    ...(titleId !== undefined ? { titleId } : {}),
    ...(titleEn !== undefined ? { titleEn } : {}),
    synopsis: text(detail.overview) ?? base.synopsis,
    durationSec: durationOf(detail.episode_run_time?.[0]),
    ageRating: tvCertification(detail, region),
    country: text(detail.origin_country?.[0]),
    backdropPath: text(detail.backdrop_path ?? undefined) ?? base.backdropPath,
    trailerKey: pickTrailerKey(detail.videos?.results),
    genres: (detail.genres ?? []).length > 0 ? genresFromApi(detail.genres ?? []) : base.genres,
    people: [...castPeople(detail.credits?.cast ?? []), ...crewPeople(detail.credits?.crew ?? [])],
  };
}
