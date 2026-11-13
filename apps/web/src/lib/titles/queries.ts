import "server-only";

import type { Prisma, Source } from "@ongx/db";

import { prisma } from "@/lib/prisma";
import { VIDIO_PROVIDER_NAME } from "@/lib/providers";

import {
  toHero,
  toPersonView,
  toTitleCard,
  toTitleDetail,
  type GenreRow,
  type HeroView,
  type PersonView,
  type TitleCardView,
  type TitleDetailView,
  type TitleKind,
} from "./view";

/**
 * Read model for the public catalog. All queries filter on `status = LIVE` so
 * drafts and broken rows never leak into the UI.
 */

const titleCardSelect = {
  id: true,
  slug: true,
  source: true,
  kind: true,
  titleId: true,
  titleEn: true,
  titleNative: true,
  posterPath: true,
  year: true,
  rating: true,
  trailerKey: true,
  offers: {
    where: { providerName: { equals: VIDIO_PROVIDER_NAME, mode: "insensitive" } },
    take: 1,
    select: { providerId: true, providerName: true },
  },
} satisfies Prisma.TitleSelect;

const genreSelect = {
  slug: true,
  nameId: true,
  nameEn: true,
} satisfies Prisma.GenreSelect;

const titleDetailSelect = {
  ...titleCardSelect,
  synopsis: true,
  backdropPath: true,
  durationSec: true,
  ageRating: true,
  country: true,
  streamUrl: true,
  genres: { select: { genre: { select: genreSelect } } },
  credits: {
    orderBy: [{ role: "asc" }, { position: "asc" }],
    select: {
      role: true,
      label: true,
      position: true,
      person: { select: { slug: true, name: true, imagePath: true } },
    },
  },
  offers: {
    orderBy: [{ offerType: "asc" }, { providerName: "asc" }],
    select: {
      region: true,
      providerId: true,
      providerName: true,
      offerType: true,
      url: true,
      logoPath: true,
    },
  },
  episodes: {
    orderBy: [{ season: "asc" }, { number: "asc" }],
    select: {
      id: true,
      season: true,
      number: true,
      name: true,
      synopsis: true,
      airDate: true,
      durationSec: true,
      stillPath: true,
      streamUrl: true,
    },
  },
} satisfies Prisma.TitleSelect;

const heroSelect = {
  ...titleCardSelect,
  synopsis: true,
  backdropPath: true,
  genres: { select: { genre: { select: genreSelect } } },
} satisfies Prisma.TitleSelect;

export type HomeRailKey =
  "trending" | "vidio" | "new" | "topRated" | "anime" | "film" | "series" | "action" | "comedy";

export type BrowseSort = "popularity" | "rating" | "newest";
export type ProviderFilter = "vidio";

export interface BrowseParams {
  kind?: TitleKind | undefined;
  source?: Source | undefined;
  genre?: string | undefined;
  year?: number | undefined;
  provider?: ProviderFilter | undefined;
  sort?: BrowseSort | undefined;
  page?: number | undefined;
  perPage?: number | undefined;
}

export interface TitlePage {
  items: TitleCardView[];
  page: number;
  totalPages: number;
  totalItems: number;
}

const POPULARITY_ORDER: Prisma.TitleOrderByWithRelationInput[] = [
  { popularity: { sort: "desc", nulls: "last" } },
  { rating: { sort: "desc", nulls: "last" } },
  { id: "asc" },
];

const RATING_ORDER: Prisma.TitleOrderByWithRelationInput[] = [
  { rating: { sort: "desc", nulls: "last" } },
  { popularity: { sort: "desc", nulls: "last" } },
  { id: "asc" },
];

const NEWEST_ORDER: Prisma.TitleOrderByWithRelationInput[] = [
  { releasedAt: { sort: "desc", nulls: "last" } },
  { year: { sort: "desc", nulls: "last" } },
  { id: "asc" },
];

function orderFor(sort: BrowseSort | undefined): Prisma.TitleOrderByWithRelationInput[] {
  switch (sort) {
    case "rating":
      return RATING_ORDER;
    case "newest":
      return NEWEST_ORDER;
    case "popularity":
    default:
      return POPULARITY_ORDER;
  }
}

function clampPage(page: number | undefined): number {
  return typeof page === "number" && Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
}

function clampPerPage(perPage: number | undefined): number {
  if (typeof perPage !== "number" || !Number.isFinite(perPage)) return 24;
  return Math.min(60, Math.max(1, Math.trunc(perPage)));
}

function liveWhere(extra: Prisma.TitleWhereInput = {}): Prisma.TitleWhereInput {
  return { status: "LIVE", ...extra };
}

/** Case-insensitive so TMDB ("Vidio") and AniList ("vidio") both match. */
const vidioOfferWhere: Prisma.WatchOfferWhereInput = {
  providerName: { equals: VIDIO_PROVIDER_NAME, mode: "insensitive" },
};

export async function browseTitles(params: BrowseParams = {}, locale = "id"): Promise<TitlePage> {
  const page = clampPage(params.page);
  const perPage = clampPerPage(params.perPage);
  const where = liveWhere({
    ...(params.kind !== undefined ? { kind: params.kind } : {}),
    ...(params.source !== undefined ? { source: params.source } : {}),
    ...(params.year !== undefined ? { year: params.year } : {}),
    ...(params.genre !== undefined ? { genres: { some: { genre: { slug: params.genre } } } } : {}),
    ...(params.provider === "vidio" ? { offers: { some: vidioOfferWhere } } : {}),
  });

  const [rows, totalItems] = await Promise.all([
    prisma.title.findMany({
      where,
      orderBy: orderFor(params.sort),
      skip: (page - 1) * perPage,
      take: perPage,
      select: titleCardSelect,
    }),
    prisma.title.count({ where }),
  ]);

  return {
    items: rows.map((row) => toTitleCard(row, locale)),
    page,
    totalPages: Math.max(1, Math.ceil(totalItems / perPage)),
    totalItems,
  };
}

interface RailDefinition {
  key: HomeRailKey;
  where: Prisma.TitleWhereInput;
  orderBy: Prisma.TitleOrderByWithRelationInput[];
  take?: number;
}

const RAILS: RailDefinition[] = [
  { key: "trending", where: liveWhere(), orderBy: POPULARITY_ORDER },
  {
    key: "new",
    where: liveWhere({ releasedAt: { not: null } }),
    orderBy: NEWEST_ORDER,
  },
  {
    key: "vidio",
    where: liveWhere({ offers: { some: vidioOfferWhere } }),
    orderBy: POPULARITY_ORDER,
  },
  {
    key: "topRated",
    where: liveWhere({ rating: { gte: 7 } }),
    orderBy: RATING_ORDER,
  },
  { key: "anime", where: liveWhere({ source: "ANILIST" }), orderBy: POPULARITY_ORDER },
  {
    key: "film",
    where: liveWhere({ kind: "MOVIE", source: "TMDB" }),
    orderBy: POPULARITY_ORDER,
  },
  {
    key: "series",
    where: liveWhere({ kind: "SERIES", source: "TMDB" }),
    orderBy: POPULARITY_ORDER,
  },
  {
    key: "action",
    where: liveWhere({ genres: { some: { genre: { slug: "action" } } } }),
    orderBy: POPULARITY_ORDER,
  },
  {
    key: "comedy",
    where: liveWhere({ genres: { some: { genre: { slug: "comedy" } } } }),
    orderBy: POPULARITY_ORDER,
  },
];

const RAIL_SIZE = 12;

/** Hero is awaited by the page shell; every rail streams in behind its own `<Suspense>`. */
export async function getHomeHero(locale: string): Promise<HeroView | null> {
  const row = await prisma.title.findFirst({
    where: liveWhere(),
    orderBy: POPULARITY_ORDER,
    select: heroSelect,
  });

  return row ? toHero(row, locale) : null;
}

export async function getHomeRail(key: HomeRailKey, locale: string): Promise<TitleCardView[]> {
  const rail = RAILS.find((definition) => definition.key === key);
  if (!rail) return [];

  const rows = await prisma.title.findMany({
    where: rail.where,
    orderBy: rail.orderBy,
    take: rail.take ?? RAIL_SIZE,
    select: titleCardSelect,
  });

  return rows.map((row) => toTitleCard(row, locale));
}

export async function getTitleBySlug(
  slug: string,
  locale: string,
): Promise<TitleDetailView | null> {
  const row = await prisma.title.findFirst({
    where: { slug, status: "LIVE" },
    select: titleDetailSelect,
  });

  return row ? toTitleDetail(row, locale) : null;
}

export async function getTitleById(id: string, locale: string): Promise<TitleDetailView | null> {
  const row = await prisma.title.findFirst({
    where: { id, status: "LIVE" },
    select: titleDetailSelect,
  });

  return row ? toTitleDetail(row, locale) : null;
}

export async function getRelatedTitles(
  title: { id: string; kind: TitleKind; source: Source; genreSlugs: string[] },
  locale: string,
  limit = 12,
): Promise<TitleCardView[]> {
  const safeLimit = Math.min(24, Math.max(1, Math.trunc(limit)));
  const genreSlugs = title.genreSlugs.filter((slug) => slug.length > 0);

  const related = await prisma.title.findMany({
    where: liveWhere({
      id: { not: title.id },
      ...(genreSlugs.length > 0
        ? { genres: { some: { genre: { slug: { in: genreSlugs } } } } }
        : { kind: title.kind }),
    }),
    orderBy: POPULARITY_ORDER,
    take: safeLimit,
    select: titleCardSelect,
  });

  return related.map((row) => toTitleCard(row, locale));
}

export interface GenreWithCount extends GenreRow {
  count: number;
}

export async function getGenres(): Promise<GenreWithCount[]> {
  const rows = await prisma.genre.findMany({
    orderBy: [{ nameId: "asc" }],
    select: { ...genreSelect, _count: { select: { titles: true } } },
  });

  return rows.map((row) => ({
    slug: row.slug,
    nameId: row.nameId,
    nameEn: row.nameEn,
    count: row._count.titles,
  }));
}

export async function getGenreBySlug(slug: string): Promise<GenreRow | null> {
  return prisma.genre.findUnique({ where: { slug }, select: genreSelect });
}

/** Distinct release years with at least one live title, newest first. */
export async function getYears(): Promise<number[]> {
  const rows = await prisma.title.findMany({
    where: liveWhere({ year: { not: null } }),
    distinct: ["year"],
    orderBy: { year: "desc" },
    select: { year: true },
  });

  return rows.flatMap((row) => (typeof row.year === "number" ? [row.year] : []));
}

export async function getPersonBySlug(slug: string, locale: string): Promise<PersonView | null> {
  const row = await prisma.person.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      imagePath: true,
      credits: {
        select: {
          role: true,
          label: true,
          title: {
            select: {
              ...titleCardSelect,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!row) return null;

  const credits = row.credits.flatMap((credit) =>
    credit.title.status === "LIVE"
      ? [
          {
            ...credit.title,
            role: credit.role,
            label: credit.label,
          },
        ]
      : [],
  );

  return toPersonView({ ...row, credits }, locale);
}
