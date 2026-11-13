import type { BrowseSort } from "./queries";

export type SearchParamValue = string | string[] | undefined;
export type SearchParams = Record<string, SearchParamValue>;

export interface BrowseFilters {
  genre?: string | undefined;
  year?: number | undefined;
  sort?: BrowseSort | undefined;
  page: number;
}

const SORTS: BrowseSort[] = ["popularity", "rating", "newest"];
const GENRE_PATTERN = /^[a-z0-9-]{1,64}$/;

function first(value: SearchParamValue): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseGenre(value: SearchParamValue): string | undefined {
  const raw = first(value)?.trim().toLowerCase();
  return raw && GENRE_PATTERN.test(raw) ? raw : undefined;
}

function parseYear(value: SearchParamValue): number | undefined {
  const raw = first(value);
  if (!raw) return undefined;
  const year = Number.parseInt(raw, 10);
  return Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : undefined;
}

function parseSort(value: SearchParamValue): BrowseSort | undefined {
  const raw = first(value);
  return SORTS.find((sort) => sort === raw);
}

function parsePage(value: SearchParamValue): number {
  const raw = first(value);
  const page = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isInteger(page) && page > 0 ? Math.min(page, 500) : 1;
}

/**
 * Reads URL state for listing pages. Invalid values are ignored instead of
 * throwing, so a hand-edited query string never breaks a page.
 */
export function parseBrowseFilters(
  searchParams: SearchParams,
  defaultSort: BrowseSort = "popularity",
): BrowseFilters {
  const genre = parseGenre(searchParams.genre);
  const year = parseYear(searchParams.year);
  const sort = parseSort(searchParams.sort) ?? defaultSort;

  return {
    ...(genre !== undefined ? { genre } : {}),
    ...(year !== undefined ? { year } : {}),
    sort,
    page: parsePage(searchParams.page),
  };
}

/** Preserves the active filters while changing one key (used by pagination). */
export function browseQuery(
  filters: BrowseFilters,
  overrides: Partial<BrowseFilters> = {},
): Record<string, string | number | undefined> {
  const merged = { ...filters, ...overrides };

  return {
    genre: merged.genre,
    year: merged.year,
    sort: merged.sort,
    page: merged.page > 1 ? merged.page : undefined,
  };
}
