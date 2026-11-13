import { tmdbImage, type TmdbImageSize } from "./sources/tmdb/images";

export type ImageSize = TmdbImageSize;

/**
 * Resolves an image reference stored in the database.
 *
 * TMDB stores relative paths (`/poster.jpg`); AniList stores absolute URLs
 * (`https://s4.anilist.co/...`). Both flow through the same components.
 */
export function imageUrl(
  path: string | null | undefined,
  size: ImageSize = "w500",
): string | undefined {
  const trimmed = path?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return tmdbImage(trimmed, size);
}
