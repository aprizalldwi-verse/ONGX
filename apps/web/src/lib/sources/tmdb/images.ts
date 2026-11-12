const IMAGE_BASE = "https://image.tmdb.org/t/p";

export type TmdbImageSize = "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original";

/**
 * Build an absolute TMDB image URL from the path stored in the database.
 * Empty/invalid paths return `undefined` so components can render a placeholder.
 */
export function tmdbImage(
  path: string | null | undefined,
  size: TmdbImageSize = "w500",
): string | undefined {
  const trimmed = path?.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${IMAGE_BASE}/${size}${normalized}`;
}
