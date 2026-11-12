import type { Kind } from "@ongx/shared";

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

/** Canonical public path for a title. */
export function titlePath(kind: Exclude<Kind, "EPISODE">, slug: string): string {
  return kind === "MOVIE" ? `/film/${slug}` : `/series/${slug}`;
}
