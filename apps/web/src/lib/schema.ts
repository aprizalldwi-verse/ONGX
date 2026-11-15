import type { EpisodeView, PersonView, TitleDetailView } from "@/lib/titles/view";

import { absoluteUrl, SITE_NAME } from "./seo";

/**
 * JSON-LD builders. Each function returns a plain object so the shape can be
 * asserted in unit tests and serialized by `<JsonLd>`.
 */

export type JsonLdObject = Record<string, unknown>;

function language(locale: string): string {
  return locale === "en" ? "en" : "id";
}

/**
 * `</script>` inside a title must not terminate the tag, and `&`/`>` are escaped
 * for the same reason. JSON strings accept `\uXXXX`, so the payload stays valid.
 */
export function serializeJsonLd(data: JsonLdObject): string {
  return (JSON.stringify(data) ?? "null")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function personRef(person: {
  name: string;
  href: string;
  imageUrl?: string | undefined;
}): JsonLdObject {
  return {
    "@type": "Person",
    name: person.name,
    url: absoluteUrl(person.href),
    ...(person.imageUrl !== undefined ? { image: person.imageUrl } : {}),
  };
}

export function websiteSchema(input: {
  siteUrl: string;
  searchUrl: string;
  locale: string;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: input.siteUrl,
    inLanguage: language(input.locale),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${input.searchUrl}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** `Movie` for TMDB films and AniList films, `TVSeries` for episodic titles. */
export function titleSchema(
  title: TitleDetailView,
  input: { url: string; locale: string },
): JsonLdObject {
  const isSeries = title.kind === "SERIES";
  const image = title.backdropUrl ?? title.posterUrl;

  return {
    "@context": "https://schema.org",
    "@type": isSeries ? "TVSeries" : "Movie",
    name: title.title,
    url: input.url,
    inLanguage: language(input.locale),
    ...(title.titleSecondary !== undefined ? { alternateName: title.titleSecondary } : {}),
    ...(title.synopsis !== undefined ? { description: title.synopsis } : {}),
    ...(image !== undefined ? { image } : {}),
    ...(title.year !== undefined ? { datePublished: String(title.year) } : {}),
    ...(title.genres.length > 0 ? { genre: title.genres.map((genre) => genre.name) } : {}),
    ...(title.country !== undefined ? { countryOfOrigin: title.country } : {}),
    ...(title.rating !== undefined
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: title.rating,
            bestRating: 10,
            worstRating: 0,
            ratingCount: 1,
          },
        }
      : {}),
    ...(title.cast.length > 0
      ? { actor: title.cast.slice(0, 10).map((person) => personRef(person)) }
      : {}),
    ...(isSeries
      ? {
          numberOfEpisodes: title.episodeCount,
          numberOfSeasons: title.seasons.length,
        }
      : {}),
  };
}

function isoDuration(seconds: number | undefined): string | undefined {
  if (seconds === undefined || seconds <= 0) return undefined;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.round(seconds % 60);

  return `PT${hours > 0 ? `${hours}H` : ""}${minutes > 0 ? `${minutes}M` : ""}${rest > 0 ? `${rest}S` : ""}`;
}

export function episodeSchema(
  title: TitleDetailView,
  episode: EpisodeView,
  input: { url: string; locale: string },
): JsonLdObject {
  const seriesUrl = absoluteUrl(title.href);
  const thumbnail = episode.stillUrl ?? title.backdropUrl ?? title.posterUrl;
  const uploadDate =
    episode.airDate ??
    (title.year !== undefined ? `${title.year}-01-01T00:00:00.000Z` : "1970-01-01T00:00:00.000Z");
  const duration = isoDuration(episode.durationSec);

  return {
    "@context": "https://schema.org",
    "@type": "TVEpisode",
    name: episode.name,
    url: input.url,
    inLanguage: language(input.locale),
    episodeNumber: episode.number,
    partOfSeason: {
      "@type": "TVSeason",
      seasonNumber: episode.season,
      partOfSeries: {
        "@type": "TVSeries",
        name: title.title,
        url: seriesUrl,
      },
    },
    ...(episode.synopsis !== undefined ? { description: episode.synopsis } : {}),
    ...(thumbnail !== undefined ? { image: thumbnail } : {}),
    ...(episode.airDate !== undefined ? { datePublished: episode.airDate } : {}),
    video: {
      "@type": "VideoObject",
      name: `${title.title} — ${episode.name}`,
      description: episode.synopsis ?? title.synopsis ?? title.title,
      thumbnailUrl: [thumbnail ?? absoluteUrl("/icon.svg")],
      uploadDate,
      ...(duration !== undefined ? { duration } : {}),
      ...(episode.watchHref.length > 0 ? { url: absoluteUrl(episode.watchHref) } : {}),
    },
  };
}

export function breadcrumbSchema(
  items: ReadonlyArray<{ name: string; href?: string | undefined }>,
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href !== undefined ? { item: absoluteUrl(item.href) } : {}),
    })),
  };
}

export function personSchema(person: PersonView): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    url: absoluteUrl(person.href),
    ...(person.imageUrl !== undefined ? { image: person.imageUrl } : {}),
    ...(person.works.length > 0
      ? {
          performerIn: person.works.slice(0, 20).map((work) => ({
            "@type": work.kind === "MOVIE" ? "Movie" : "TVSeries",
            name: work.title,
            url: absoluteUrl(work.href),
          })),
        }
      : {}),
  };
}
