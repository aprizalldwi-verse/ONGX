const DIACRITICS = /[\u0300-\u036f]/g;
const NON_SLUG = /[^a-z0-9]+/g;
const EDGE_DASH = /^-+|-+$/g;

/** Lowercase, accent-stripped, dash-separated. Never returns an empty string. */
export function slugify(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(NON_SLUG, "-")
    .replace(EDGE_DASH, "");

  return slug.length > 0 ? slug : "untitled";
}

/**
 * `{title}-{year}` per the SEO rules; year is dropped when unknown.
 * The result is the *base* candidate — collision handling belongs to the DB layer.
 */
export function buildTitleSlug(title: string, year?: number | null): string {
  const base = slugify(title);
  const suffix = typeof year === "number" && Number.isFinite(year) ? `-${year}` : "";
  return `${base}${suffix}`;
}

/** Appends `-2`, `-3`, ... until a free candidate is found. Pure, caller supplies the check. */
export function dedupeSlug(base: string, isTaken: (candidate: string) => boolean): string {
  if (!isTaken(base)) return base;

  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!isTaken(candidate)) return candidate;
  }

  return `${base}-${Date.now()}`;
}
