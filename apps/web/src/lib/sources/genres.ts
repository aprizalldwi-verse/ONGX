import { GENRES } from "@ongx/db/genres";
import { slugify, type NormalizedGenre } from "@ongx/shared";

const byTmdbId = new Map<number, NormalizedGenre>(
  GENRES.map((genre) => [
    genre.tmdbId,
    { slug: genre.slug, nameId: genre.nameId, nameEn: genre.nameEn, tmdbId: genre.tmdbId },
  ]),
);

/** Canonical genre for a TMDB id, or `undefined` when we do not track it. */
export function genreFromTmdbId(tmdbId: number): NormalizedGenre | undefined {
  return byTmdbId.get(tmdbId);
}

const bySlug = new Map<string, NormalizedGenre>(
  GENRES.map((genre) => [
    genre.slug,
    { slug: genre.slug, nameId: genre.nameId, nameEn: genre.nameEn, tmdbId: genre.tmdbId },
  ]),
);

export function genreFromSlug(slug: string): NormalizedGenre | undefined {
  return bySlug.get(slug);
}

/**
 * Fallback for TMDB genres outside the fixed 24: keeps the id and uses the
 * English API name for both locales until a translation is added.
 */
export function genreFromApi(tmdbId: number, name: string): NormalizedGenre {
  return byTmdbId.get(tmdbId) ?? { slug: slugify(name), nameId: name, nameEn: name, tmdbId };
}

export function genresFromIds(ids: number[]): NormalizedGenre[] {
  const seen = new Set<number>();
  const result: NormalizedGenre[] = [];

  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const genre = byTmdbId.get(id);
    if (genre) result.push(genre);
  }

  return result;
}

export function genresFromApi(items: { id: number; name: string }[]): NormalizedGenre[] {
  const seen = new Set<number>();
  const result: NormalizedGenre[] = [];

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(genreFromApi(item.id, item.name));
  }

  return result;
}

/** All seeded genres, in the canonical order. */
export function allGenres(): NormalizedGenre[] {
  return [...byTmdbId.values()];
}
