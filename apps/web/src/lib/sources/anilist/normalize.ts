import {
  buildTitleSlug,
  slugify,
  type Kind,
  type NormalizedEpisode,
  type NormalizedOffer,
  type NormalizedPerson,
  type NormalizedTitle,
  type OfferType,
} from "@ongx/shared";

import { genresFromAniList } from "./genres";
import type {
  AniListExternalLink,
  AniListMedia,
  AniListMediaDetail,
  AniListStreamingEpisode,
} from "./schemas";

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(
      /&(?:amp|lt|gt|quot|nbsp);|&#0?39;/gi,
      (match) => ENTITIES[match.toLowerCase()] ?? match,
    );
}

/**
 * AniList descriptions are HTML: `<br>` becomes a newline, every other tag is
 * removed and the common entities are decoded. Nothing raw reaches the UI.
 */
export function stripHtml(input: string | null | undefined): string | undefined {
  const raw = input?.replace(/\r\n?/g, "\n");
  if (!raw) return undefined;

  const withoutTags = raw.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "");
  const cleaned = decodeEntities(withoutTags)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned.length > 0 ? cleaned : undefined;
}

function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function countOf(value: number | null | undefined): number | undefined {
  return typeof value === "number" && value > 0 ? Math.trunc(value) : undefined;
}

/** AniList scores are 0–100; our domain stores a 10-point rating like TMDB. */
export function ratingFromScore(score: number | null | undefined): number | undefined {
  if (typeof score !== "number" || score <= 0) return undefined;
  return Math.round((score / 10) * 10) / 10;
}

export function kindFromFormat(format: string | null | undefined): Kind {
  return format === "MOVIE" ? "MOVIE" : "SERIES";
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function isoDate(media: AniListMedia): string | undefined {
  const year = media.startDate?.year ?? media.seasonYear;
  if (typeof year !== "number" || year < 1900) return undefined;

  const month = media.startDate?.month ?? 1;
  const day = media.startDate?.day ?? 1;

  return `${year}-${pad(Math.min(12, Math.max(1, month)))}-${pad(Math.min(31, Math.max(1, day)))}`;
}

function yearOf(media: AniListMedia): number | undefined {
  const year = media.startDate?.year ?? media.seasonYear;
  return typeof year === "number" && year >= 1900 ? Math.trunc(year) : undefined;
}

function trailerKeyOf(media: AniListMedia): string | undefined {
  if (media.trailer?.site?.toLowerCase() !== "youtube") return undefined;
  return text(media.trailer.id);
}

function posterOf(media: AniListMedia): string {
  return text(media.coverImage?.extraLarge) ?? text(media.coverImage?.large) ?? "";
}

function httpUrl(value: string): string | undefined {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * AniList publishes the official streaming destinations per title through
 * `externalLinks`. It has no regional availability or price model, so offers are
 * stored under the `WW` pseudo-region and priced as `FLATRATE` — except official
 * YouTube channels, which are free to watch. See ASUMSI-034.
 */
export function normalizeAniListOffers(
  links: AniListExternalLink[] | undefined,
): NormalizedOffer[] {
  const offers: NormalizedOffer[] = [];
  const seen = new Set<string>();

  for (const link of links ?? []) {
    if (link.type !== "STREAMING" || link.isDisabled === true) continue;

    const url = httpUrl(link.url);
    const site = text(link.site);
    if (!url || !site) continue;

    const providerId = slugify(site);
    if (providerId.length === 0) continue;

    const offerType: OfferType = providerId === "youtube" ? "FREE" : "FLATRATE";
    const key = `${providerId}:${offerType}`;
    if (seen.has(key)) continue;
    seen.add(key);

    offers.push({ region: "WW", providerId, providerName: site, offerType, url });
  }

  return offers;
}

export function normalizeAniListMedia(media: AniListMedia): NormalizedTitle {
  const romaji = text(media.title.romaji);
  const english = text(media.title.english);
  const native = text(media.title.native);
  const display = romaji ?? english ?? native ?? "Untitled";
  const year = yearOf(media);
  const releasedAt = isoDate(media);
  const synopsis = stripHtml(media.description);
  const durationSec = countOf(media.duration);
  const rating = ratingFromScore(media.averageScore);
  const backdropPath = text(media.bannerImage);
  const trailerKey = trailerKeyOf(media);
  const country = text(media.countryOfOrigin);

  return {
    source: "ANILIST",
    kind: kindFromFormat(media.format),
    remoteId: String(media.id),
    slug: buildTitleSlug(display, year),
    titleId: display,
    ...(english !== undefined ? { titleEn: english } : {}),
    ...(native !== undefined ? { titleNative: native } : {}),
    ...(synopsis !== undefined ? { synopsis } : {}),
    ...(year !== undefined ? { year } : {}),
    ...(releasedAt !== undefined ? { releasedAt } : {}),
    ...(durationSec !== undefined ? { durationSec: durationSec * 60 } : {}),
    ...(rating !== undefined ? { rating } : {}),
    ...(typeof media.popularity === "number" && media.popularity >= 0
      ? { popularity: media.popularity }
      : {}),
    posterPath: posterOf(media),
    ...(backdropPath !== undefined ? { backdropPath } : {}),
    ...(trailerKey !== undefined ? { trailerKey } : {}),
    ...(country !== undefined ? { country } : {}),
    genres: genresFromAniList(media.genres),
    people: [],
    offers: [],
  };
}

function staffPeople(media: AniListMediaDetail): NormalizedPerson[] {
  return (media.staff?.edges ?? []).slice(0, 10).map((edge, index) => {
    const name = edge.node.name.full;
    const imagePath = text(edge.node.image?.large);
    const label = text(edge.role);

    return {
      slug: slugify(name),
      name,
      ...(imagePath !== undefined ? { imagePath } : {}),
      role: "CREW",
      ...(label !== undefined ? { label } : {}),
      position: index,
    };
  });
}

export function normalizeAniListDetail(media: AniListMediaDetail): NormalizedTitle {
  const base = normalizeAniListMedia(media);
  const episodesCount = countOf(media.episodes) ?? media.streamingEpisodes?.length;

  return {
    ...base,
    ...(base.kind === "SERIES" && episodesCount !== undefined && episodesCount > 0
      ? {
          seasons: [{ number: 1, name: "Season 1", episodeCount: episodesCount }],
          episodesCount,
        }
      : {}),
    people: staffPeople(media),
    offers: normalizeAniListOffers(media.externalLinks),
  };
}

export interface AniListEpisodeSource {
  episodes?: number | null | undefined;
  duration?: number | null | undefined;
  streamingEpisodes?: AniListStreamingEpisode[] | undefined;
}

/** AniList exposes one continuous episode list, so only season 1 is valid. */
export function normalizeAniListEpisodes(
  media: AniListEpisodeSource,
  season = 1,
): NormalizedEpisode[] {
  if (season !== 1) return [];

  const durationSec =
    countOf(media.duration) !== undefined ? Math.trunc((media.duration ?? 0) * 60) : undefined;
  const streaming = media.streamingEpisodes ?? [];

  if (streaming.length > 0) {
    return streaming.map((episode, index) => {
      const name = text(episode.title) ?? `Episode ${index + 1}`;
      const stillPath = text(episode.thumbnail);

      return {
        season: 1,
        number: index + 1,
        name,
        ...(stillPath !== undefined ? { stillPath } : {}),
        ...(durationSec !== undefined ? { durationSec } : {}),
      };
    });
  }

  const count = Math.min(500, countOf(media.episodes) ?? 0);
  return Array.from({ length: count }, (_, index) => ({
    season: 1,
    number: index + 1,
    name: `Episode ${index + 1}`,
    ...(durationSec !== undefined ? { durationSec } : {}),
  }));
}
