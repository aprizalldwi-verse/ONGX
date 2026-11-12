import type { NormalizedGenre, NormalizedPerson } from "@ongx/shared";

/**
 * Pure normalization helpers used before writing rows. Kept free of Prisma so
 * they can be unit tested without a database.
 */

function genreKey(genre: NormalizedGenre): string {
  return genre.tmdbId !== undefined ? `tmdb:${genre.tmdbId}` : `slug:${genre.slug}`;
}

export function uniqueGenres(genres: NormalizedGenre[]): NormalizedGenre[] {
  const seen = new Set<string>();
  const result: NormalizedGenre[] = [];

  for (const genre of genres) {
    const key = genreKey(genre);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(genre);
  }

  return result;
}

function creditKey(person: NormalizedPerson): string {
  const identity = person.tmdbId !== undefined ? `tmdb:${person.tmdbId}` : `slug:${person.slug}`;
  return `${identity}:${person.role ?? "CAST"}:${person.label ?? ""}`;
}

/**
 * Dedupes credits by person/role/label and renumbers positions so the UI order
 * is deterministic. TMDB occasionally repeats a person across characters.
 */
export function uniqueCredits(people: NormalizedPerson[]): NormalizedPerson[] {
  const seen = new Set<string>();
  const result: NormalizedPerson[] = [];

  for (const person of people) {
    const key = creditKey(person);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...person, position: result.length });
  }

  return result;
}
