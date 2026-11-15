import type { Metadata } from "next";

import type { Locale } from "@/i18n/routing";

/**
 * SEO primitives shared by every page. Pure and dependency-light so it can be
 * unit tested without a database or a Next request.
 */

export const SITE_NAME = "ONGX";
export const DESCRIPTION_MIN = 150;
export const DESCRIPTION_MAX = 160;

const FALLBACK_SITE_URL = "http://localhost:3000";

const FILLERS: Record<Locale, readonly [string, string]> = {
  id: [
    " Nonton film, series, dan anime pilihan di ONGX dengan tautan resmi ke provider streaming, trailer, dan jadwal rilis terbaru.",
    " Katalog diperbarui setiap hari dengan rekomendasi yang mudah ditemukan.",
  ],
  en: [
    " Watch movies, series, and anime on ONGX with official links to streaming providers, trailers, and the latest release schedule.",
    " The catalog is updated daily with easy-to-find recommendations.",
  ],
};

function asLocale(locale: string): Locale {
  return locale === "en" ? "en" : "id";
}

/**
 * Public origin without a trailing slash. `env.public.ts` validates the value at
 * app start; tests and scripts can run without it, so a localhost fallback keeps
 * this module side-effect free.
 */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (raw && raw.length > 0 ? raw : FALLBACK_SITE_URL).replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  const normal = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl()}${normal}`;
}

/** `/film/x` → `/en/film/x` (the default locale has no prefix). */
export function localizedPath(path: string, locale: string): string {
  const normal = path.startsWith("/") ? path : `/${path}`;
  if (asLocale(locale) !== "en") return normal;
  return normal === "/" ? "/en" : `/en${normal}`;
}

/** Absolute canonical plus `id`, `en` and `x-default` hreflang targets. */
export function alternatesFor(path: string, locale: string): NonNullable<Metadata["alternates"]> {
  const normal = path.startsWith("/") ? path : `/${path}`;
  const enPath = localizedPath(normal, "en");
  const canonicalPath = asLocale(locale) === "en" ? enPath : normal;

  return {
    canonical: absoluteUrl(canonicalPath),
    languages: {
      id: absoluteUrl(normal),
      en: absoluteUrl(enPath),
      "x-default": absoluteUrl(normal),
    },
  };
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Cuts to at most `max` characters. The ellipsis counts toward the limit, and
 * the cut keeps a hard floor near `DESCRIPTION_MIN` so a single long word never
 * collapses the description to a stub.
 */
function truncateAtWord(value: string, max: number): string {
  if (value.length <= max) return value;

  const slice = value.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace >= DESCRIPTION_MIN - 1 ? slice.slice(0, lastSpace) : slice;
  const cleaned = cut.replace(/[\s,;:.\-–—]+$/, "");

  return `${cleaned}…`;
}

/**
 * Produces a deterministic description between 150 and 160 characters.
 * Short synopses are extended with locale-aware filler; long ones are trimmed
 * at a word boundary. `fallback` is used when the primary text is empty.
 */
export function clampDescription(
  value: string | null | undefined,
  locale: string,
  fallback?: string | null,
): string {
  const fillers = FILLERS[asLocale(locale)];
  let text = normalize(value) || normalize(fallback) || SITE_NAME;

  if (text.length >= DESCRIPTION_MIN) return truncateAtWord(text, DESCRIPTION_MAX);

  for (const filler of fillers) {
    text = normalize(`${text}${filler}`);
    if (text.length >= DESCRIPTION_MIN) break;
  }

  return truncateAtWord(text, DESCRIPTION_MAX);
}

export type OpenGraphType =
  "website" | "article" | "video.movie" | "video.tv_show" | "video.episode";

export interface PageMetadataInput {
  title: string;
  description: string;
  /** Unlocalized public path, optionally with a query string. */
  path: string;
  locale: string;
  type?: OpenGraphType;
  noindex?: boolean;
}

/** Per-page metadata with absolute canonical + hreflang. */
export function pageMetadata(input: PageMetadataInput): Metadata {
  const locale = asLocale(input.locale);
  const url = absoluteUrl(localizedPath(input.path, locale));
  const fullTitle = `${input.title} — ${SITE_NAME}`;

  return {
    title: input.title,
    description: input.description,
    alternates: alternatesFor(input.path, locale),
    openGraph: {
      type: input.type ?? "website",
      title: fullTitle,
      description: input.description,
      url,
      siteName: SITE_NAME,
      locale: locale === "en" ? "en_US" : "id_ID",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: input.description,
    },
    ...(input.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
