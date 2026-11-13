import { z } from "zod";

import type { TitleCardView, TitleDetailView } from "@/lib/titles/view";

import { titlePath, watchPath } from "./titles/slug";

/**
 * Device-local library and playlist. No account, no server sync: everything is
 * stored in `localStorage` behind a defensive parser so corrupt or hand-edited
 * data can never crash a page. The helpers take an injected `Storage`-like
 * object, which keeps them unit testable outside a browser.
 */

export const SAVED_KEY = "ongx:saved";
export const PLAYLIST_KEY = "ongx:playlist";
export const LIBRARY_LIMIT = 100;

const entrySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  source: z.enum(["TMDB", "ANILIST", "OWN"]),
  kind: z.enum(["MOVIE", "SERIES"]),
  title: z.string().min(1),
  titleSecondary: z.string().optional(),
  posterUrl: z.string().optional(),
  year: z.number().optional(),
  rating: z.number().optional(),
  availableOnVidio: z.boolean(),
  addedAt: z.number(),
});

const listSchema = z.array(entrySchema);

export type LibraryEntry = z.infer<typeof entrySchema>;

export interface LibraryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The subset of a detail view that a saved/playlist entry needs. */
export type LibraryTitle = Pick<
  TitleDetailView,
  | "id"
  | "slug"
  | "source"
  | "kind"
  | "title"
  | "titleSecondary"
  | "posterUrl"
  | "year"
  | "rating"
  | "availableOnVidio"
>;

function sortEntries(entries: LibraryEntry[]): LibraryEntry[] {
  return [...entries].sort((a, b) => b.addedAt - a.addedAt || a.id.localeCompare(b.id));
}

function readList(storage: LibraryStorage, key: string): LibraryEntry[] {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return [];
  }

  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    const result = listSchema.safeParse(parsed);
    if (!result.success) return [];
    return sortEntries(result.data).slice(0, LIBRARY_LIMIT);
  } catch {
    return [];
  }
}

function writeList(storage: LibraryStorage, key: string, entries: LibraryEntry[]): void {
  try {
    storage.setItem(key, JSON.stringify(sortEntries(entries).slice(0, LIBRARY_LIMIT)));
  } catch {
    // Storage can be unavailable (private mode, quota); the list just stays empty.
  }
}

/** Narrows a detail view to the fields the client buttons need. */
export function toLibraryTitle(title: TitleDetailView): LibraryTitle {
  return {
    id: title.id,
    slug: title.slug,
    source: title.source,
    kind: title.kind,
    title: title.title,
    titleSecondary: title.titleSecondary,
    posterUrl: title.posterUrl,
    year: title.year,
    rating: title.rating,
    availableOnVidio: title.availableOnVidio,
  };
}

export function toLibraryEntry(title: LibraryTitle, addedAt = Date.now()): LibraryEntry {
  return {
    id: title.id,
    slug: title.slug,
    source: title.source,
    kind: title.kind,
    title: title.title,
    ...(title.titleSecondary !== undefined ? { titleSecondary: title.titleSecondary } : {}),
    ...(title.posterUrl !== undefined ? { posterUrl: title.posterUrl } : {}),
    ...(title.year !== undefined ? { year: title.year } : {}),
    ...(title.rating !== undefined ? { rating: title.rating } : {}),
    availableOnVidio: title.availableOnVidio,
    addedAt,
  };
}

/** Rebuilds a poster card from stored fields so the same grid can render it. */
export function toLibraryCard(entry: LibraryEntry): TitleCardView {
  return {
    id: entry.id,
    slug: entry.slug,
    href: titlePath(entry.kind, entry.slug, entry.source),
    watchHref: watchPath(entry.id),
    title: entry.title,
    ...(entry.titleSecondary !== undefined ? { titleSecondary: entry.titleSecondary } : {}),
    ...(entry.posterUrl !== undefined ? { posterUrl: entry.posterUrl } : {}),
    ...(entry.year !== undefined ? { year: entry.year } : {}),
    ...(entry.rating !== undefined ? { rating: entry.rating } : {}),
    kind: entry.kind,
    source: entry.source,
    availableOnVidio: entry.availableOnVidio,
  };
}

export function readSaved(storage: LibraryStorage): LibraryEntry[] {
  return readList(storage, SAVED_KEY);
}

export function writeSaved(storage: LibraryStorage, entries: LibraryEntry[]): void {
  writeList(storage, SAVED_KEY, entries);
}

export function isSaved(entries: LibraryEntry[], id: string): boolean {
  return entries.some((entry) => entry.id === id);
}

export function toggleSaved(entries: LibraryEntry[], entry: LibraryEntry): LibraryEntry[] {
  if (isSaved(entries, entry.id)) return entries.filter((item) => item.id !== entry.id);
  return sortEntries([entry, ...entries]).slice(0, LIBRARY_LIMIT);
}

export function removeSaved(entries: LibraryEntry[], id: string): LibraryEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

export function readPlaylist(storage: LibraryStorage): LibraryEntry[] {
  return readList(storage, PLAYLIST_KEY);
}

export function writePlaylist(storage: LibraryStorage, entries: LibraryEntry[]): void {
  writeList(storage, PLAYLIST_KEY, entries);
}

export function isInPlaylist(entries: LibraryEntry[], id: string): boolean {
  return entries.some((entry) => entry.id === id);
}

/** Adding is idempotent so double clicks cannot duplicate a row. */
export function addToPlaylist(entries: LibraryEntry[], entry: LibraryEntry): LibraryEntry[] {
  if (isInPlaylist(entries, entry.id)) return entries;
  return sortEntries([entry, ...entries]).slice(0, LIBRARY_LIMIT);
}

export function removeFromPlaylist(entries: LibraryEntry[], id: string): LibraryEntry[] {
  return entries.filter((entry) => entry.id !== id);
}
