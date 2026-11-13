import type { Kind, OfferType, Source } from "@ongx/shared";

import { imageUrl } from "@/lib/images";

import { episodePath, titlePath, watchPath } from "./slug";

/**
 * Pure presentation helpers: database rows in, localized view models out.
 * Nothing here imports Prisma, `server-only` or React, so it is unit testable.
 */

export type TitleKind = Exclude<Kind, "EPISODE">;
export type CreditRole = "CAST" | "CREW";

export interface TitleCardRow {
  id: string;
  slug: string;
  source: Source;
  kind: Kind;
  titleId: string;
  titleEn?: string | null | undefined;
  titleNative?: string | null | undefined;
  posterPath: string;
  year?: number | null | undefined;
  rating?: number | null | undefined;
  trailerKey?: string | null | undefined;
}

export interface GenreRow {
  slug: string;
  nameId: string;
  nameEn: string;
}

export interface CreditRow {
  role: CreditRole;
  label?: string | null | undefined;
  position: number;
  person: {
    slug: string;
    name: string;
    imagePath?: string | null | undefined;
  };
}

export interface OfferRow {
  region: string;
  providerId: string;
  providerName: string;
  offerType: OfferType;
  url: string;
  logoPath?: string | null | undefined;
}

export interface EpisodeRow {
  id: string;
  season: number;
  number: number;
  name: string;
  synopsis?: string | null | undefined;
  airDate?: Date | null | undefined;
  durationSec?: number | null | undefined;
  stillPath?: string | null | undefined;
  streamUrl?: string | null | undefined;
}

export interface TitleDetailRow extends TitleCardRow {
  synopsis?: string | null | undefined;
  backdropPath?: string | null | undefined;
  durationSec?: number | null | undefined;
  ageRating?: string | null | undefined;
  country?: string | null | undefined;
  streamUrl?: string | null | undefined;
  genres: { genre: GenreRow }[];
  credits: CreditRow[];
  offers: OfferRow[];
  episodes: EpisodeRow[];
}

export interface TitleCardView {
  id: string;
  slug: string;
  href: string;
  watchHref: string;
  title: string;
  titleSecondary?: string | undefined;
  posterUrl?: string | undefined;
  year?: number | undefined;
  rating?: number | undefined;
  kind: TitleKind;
  source: Source;
  trailerKey?: string | undefined;
}

export interface GenreView {
  slug: string;
  name: string;
  href: string;
}

export interface PersonCreditView {
  slug: string;
  name: string;
  href: string;
  imageUrl?: string | undefined;
  label?: string | undefined;
}

export interface OfferView {
  providerId: string;
  providerName: string;
  offerType: OfferType;
  url: string;
  logoUrl?: string | undefined;
}

export interface EpisodeView {
  id: string;
  season: number;
  number: number;
  name: string;
  synopsis?: string | undefined;
  airDateLabel?: string | undefined;
  durationLabel?: string | undefined;
  stillUrl?: string | undefined;
  streamUrl?: string | undefined;
  href: string;
  watchHref: string;
  hasStream: boolean;
}

export interface SeasonView {
  number: number;
  episodes: EpisodeView[];
}

export interface TitleDetailView extends TitleCardView {
  synopsis?: string | undefined;
  backdropUrl?: string | undefined;
  durationLabel?: string | undefined;
  ageRating?: string | undefined;
  country?: string | undefined;
  streamUrl?: string | undefined;
  genres: GenreView[];
  cast: PersonCreditView[];
  crew: PersonCreditView[];
  offers: OfferView[];
  seasons: SeasonView[];
  episodeCount: number;
  hasOwnStream: boolean;
}

export interface HeroView extends TitleCardView {
  synopsis?: string | undefined;
  backdropUrl?: string | undefined;
  genres: GenreView[];
}

export interface PersonWorkView extends TitleCardView {
  role: CreditRole;
  label?: string | undefined;
}

export interface PersonView {
  slug: string;
  name: string;
  href: string;
  imageUrl?: string | undefined;
  works: PersonWorkView[];
}

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function titleKind(kind: Kind): TitleKind {
  return kind === "SERIES" ? "SERIES" : "MOVIE";
}

/** Indonesian titles are primary; English falls back through `titleEn`. */
export function localizedTitle(row: TitleCardRow, locale: string): string {
  const primary = clean(row.titleId) ?? clean(row.titleNative) ?? clean(row.titleEn) ?? "Untitled";

  if (locale !== "en") return primary;
  return clean(row.titleEn) ?? primary;
}

export function localizedGenre(genre: GenreRow, locale: string): string {
  return locale === "en" ? (clean(genre.nameEn) ?? genre.nameId) : genre.nameId;
}

export function genreView(genre: GenreRow, locale: string): GenreView {
  return {
    slug: genre.slug,
    name: localizedGenre(genre, locale),
    href: `/genre/${genre.slug}`,
  };
}

export function ratingOf(rating: number | null | undefined): number | undefined {
  if (typeof rating !== "number" || !Number.isFinite(rating) || rating <= 0) return undefined;
  return Math.round(rating * 10) / 10;
}

/** `7260` → `2j 1m` (id) / `2h 1m` (en). */
export function formatDuration(
  seconds: number | null | undefined,
  locale: string,
): string | undefined {
  if (typeof seconds !== "number" || seconds <= 0) return undefined;

  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return locale === "en" ? `${hours}h` : `${hours}j`;
  return locale === "en" ? `${hours}h ${minutes}m` : `${hours}j ${minutes}m`;
}

/** UTC keeps server and client output identical for date-only values. */
export function formatAirDate(date: Date | null | undefined, locale: string): string | undefined {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return undefined;

  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function toTitleCard(row: TitleCardRow, locale: string): TitleCardView {
  const kind = titleKind(row.kind);
  const title = localizedTitle(row, locale);
  const secondarySource = locale === "en" ? row.titleId : row.titleEn;
  const titleSecondary = clean(secondarySource);
  const rating = ratingOf(row.rating);
  const trailerKey = clean(row.trailerKey);

  return {
    id: row.id,
    slug: row.slug,
    href: titlePath(kind, row.slug, row.source),
    watchHref: watchPath(row.id),
    title,
    ...(titleSecondary !== undefined && titleSecondary !== title ? { titleSecondary } : {}),
    ...(imageUrl(row.posterPath, "w342") !== undefined
      ? { posterUrl: imageUrl(row.posterPath, "w342") }
      : {}),
    ...(typeof row.year === "number" && row.year > 0 ? { year: row.year } : {}),
    ...(rating !== undefined ? { rating } : {}),
    kind,
    source: row.source,
    ...(trailerKey !== undefined ? { trailerKey } : {}),
  };
}

function creditView(credit: CreditRow): PersonCreditView {
  const label = clean(credit.label);

  return {
    slug: credit.person.slug,
    name: credit.person.name,
    href: `/orang/${credit.person.slug}`,
    ...(imageUrl(credit.person.imagePath, "w185") !== undefined
      ? { imageUrl: imageUrl(credit.person.imagePath, "w185") }
      : {}),
    ...(label !== undefined ? { label } : {}),
  };
}

function offerView(offer: OfferRow): OfferView {
  const logo = imageUrl(offer.logoPath, "w92");

  return {
    providerId: offer.providerId,
    providerName: offer.providerName,
    offerType: offer.offerType,
    url: offer.url,
    ...(logo !== undefined ? { logoUrl: logo } : {}),
  };
}

/** Flatrate/free first, then ads, then paid options. */
const OFFER_ORDER: Record<OfferType, number> = {
  FLATRATE: 0,
  FREE: 1,
  ADS: 2,
  RENT: 3,
  BUY: 4,
};

export function sortOffers(offers: OfferView[]): OfferView[] {
  return [...offers].sort(
    (a, b) =>
      OFFER_ORDER[a.offerType] - OFFER_ORDER[b.offerType] ||
      a.providerName.localeCompare(b.providerName),
  );
}

export function toEpisodeView(
  row: EpisodeRow,
  title: Pick<TitleCardRow, "id" | "slug" | "source">,
  locale: string,
): EpisodeView {
  const synopsis = clean(row.synopsis);
  const airDateLabel = formatAirDate(row.airDate, locale);
  const durationLabel = formatDuration(row.durationSec, locale);
  const stillUrl = imageUrl(row.stillPath, "w342");
  const streamUrl = clean(row.streamUrl);

  return {
    id: row.id,
    season: row.season,
    number: row.number,
    name: clean(row.name) ?? `Episode ${row.number}`,
    ...(synopsis !== undefined ? { synopsis } : {}),
    ...(airDateLabel !== undefined ? { airDateLabel } : {}),
    ...(durationLabel !== undefined ? { durationLabel } : {}),
    ...(stillUrl !== undefined ? { stillUrl } : {}),
    ...(streamUrl !== undefined ? { streamUrl } : {}),
    href: episodePath(title.source, title.slug, row.season, row.number),
    watchHref: watchPath(title.id, { season: row.season, number: row.number }),
    hasStream: Boolean(streamUrl),
  };
}

function seasonViews(
  rows: EpisodeRow[],
  title: Pick<TitleCardRow, "id" | "slug" | "source">,
  locale: string,
): SeasonView[] {
  const bySeason = new Map<number, EpisodeView[]>();

  for (const row of rows) {
    const view = toEpisodeView(row, title, locale);
    const list = bySeason.get(row.season);
    if (list) list.push(view);
    else bySeason.set(row.season, [view]);
  }

  return [...bySeason.entries()]
    .sort(([a], [b]) => a - b)
    .map(([number, episodes]) => ({
      number,
      episodes: [...episodes].sort((a, b) => a.number - b.number),
    }));
}

export function toTitleDetail(row: TitleDetailRow, locale: string): TitleDetailView {
  const card = toTitleCard(row, locale);
  const synopsis = clean(row.synopsis);
  const backdropUrl = imageUrl(row.backdropPath, "w780");
  const durationLabel = formatDuration(row.durationSec, locale);
  const ageRating = clean(row.ageRating);
  const country = clean(row.country);
  const streamUrl = clean(row.streamUrl);
  const cast = row.credits
    .filter((credit) => credit.role === "CAST")
    .sort((a, b) => a.position - b.position)
    .map(creditView);
  const crew = row.credits
    .filter((credit) => credit.role === "CREW")
    .sort((a, b) => a.position - b.position)
    .map(creditView);
  const seasons = seasonViews(row.episodes, row, locale);

  return {
    ...card,
    ...(synopsis !== undefined ? { synopsis } : {}),
    ...(backdropUrl !== undefined ? { backdropUrl } : {}),
    ...(durationLabel !== undefined ? { durationLabel } : {}),
    ...(ageRating !== undefined ? { ageRating } : {}),
    ...(country !== undefined ? { country } : {}),
    ...(streamUrl !== undefined ? { streamUrl } : {}),
    genres: row.genres.map((entry) => genreView(entry.genre, locale)),
    cast,
    crew,
    offers: sortOffers(row.offers.map(offerView)),
    seasons,
    episodeCount: row.episodes.length,
    hasOwnStream: Boolean(streamUrl),
  };
}

export interface HeroRow extends TitleCardRow {
  synopsis?: string | null | undefined;
  backdropPath?: string | null | undefined;
  genres: { genre: GenreRow }[];
}

export function toHero(row: HeroRow, locale: string): HeroView {
  const card = toTitleCard(row, locale);
  const synopsis = clean(row.synopsis);
  const backdropUrl = imageUrl(row.backdropPath, "w780");

  return {
    ...card,
    ...(synopsis !== undefined ? { synopsis } : {}),
    ...(backdropUrl !== undefined ? { backdropUrl } : {}),
    genres: row.genres.map((entry) => genreView(entry.genre, locale)),
  };
}

export interface PersonWorkRow extends TitleCardRow {
  role: CreditRole;
  label?: string | null | undefined;
}

export function toPersonView(
  person: {
    slug: string;
    name: string;
    imagePath?: string | null | undefined;
    credits: PersonWorkRow[];
  },
  locale: string,
): PersonView {
  const byTitle = new Map<string, PersonWorkView>();

  for (const credit of person.credits) {
    const existing = byTitle.get(credit.id);
    const label = clean(credit.label);

    if (existing) {
      if (existing.label === undefined && label !== undefined) existing.label = label;
      continue;
    }

    byTitle.set(credit.id, {
      ...toTitleCard(credit, locale),
      role: credit.role,
      ...(label !== undefined ? { label } : {}),
    });
  }

  const works = [...byTitle.values()].sort(
    (a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title),
  );
  const image = imageUrl(person.imagePath, "w342");

  return {
    slug: person.slug,
    name: person.name,
    href: `/orang/${person.slug}`,
    ...(image !== undefined ? { imageUrl: image } : {}),
    works,
  };
}
