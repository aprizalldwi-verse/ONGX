import type { Kind, Source } from "@ongx/shared";

/**
 * Appends `-2`, `-3`, ... until `isTaken` returns false. Async because the
 * uniqueness check lives in the database, but the algorithm itself is pure.
 */
export async function freeSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  if (!(await isTaken(base))) return base;

  for (let i = 2; i < 1_000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  return `${base}-${Date.now()}`;
}

/** Strips a collision suffix like `-2` so renamed titles still detect changes. */
export function stripCollisionSuffix(slug: string): string {
  return slug.replace(/-\d{1,3}$/, "");
}

/**
 * Canonical public path for a title. AniList titles live under `/anime`, even
 * when their format is MOVIE, so the catalog stays source-aligned.
 */
export function titlePath(kind: Exclude<Kind, "EPISODE">, slug: string, source?: Source): string {
  if (source === "ANILIST") return `/anime/${slug}`;
  return kind === "MOVIE" ? `/film/${slug}` : `/series/${slug}`;
}

/** Query string-less watch path; episode context is added by the caller. */
export function watchPath(
  id: string,
  episode?: { season: number; number: number } | undefined,
): string {
  if (!episode) return `/watch/${id}`;
  return `/watch/${id}?s=${episode.season}&e=${episode.number}`;
}

/** Episode page. Anime keeps its `/anime` prefix so the source stays visible. */
export function episodePath(source: Source, slug: string, season: number, number: number): string {
  const base = source === "ANILIST" ? `/anime/${slug}` : `/series/${slug}`;
  return `${base}/s/${season}/e/${number}`;
}
