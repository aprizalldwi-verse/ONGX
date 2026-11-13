import type { Kind, Source } from "@ongx/shared";

/**
 * Continue-watching is device-local: no account, no server sync. The storage
 * helpers are pure (the caller injects a `Storage`-like object) so they can be
 * unit tested without a browser.
 */

export interface ContinueEntry {
  titleId: string;
  slug: string;
  source: Source;
  kind: Exclude<Kind, "EPISODE">;
  title: string;
  posterUrl?: string | undefined;
  season?: number | undefined;
  number?: number | undefined;
  episodeName?: string | undefined;
  positionSec: number;
  durationSec?: number | undefined;
  updatedAt: number;
}

export interface ContinueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const CONTINUE_KEY = "ongx:continue";
export const CONTINUE_LIMIT = 20;

/** Progress below this is treated as "not started yet". */
export const RESUME_MIN_SEC = 10;

/** Progress above this ratio is treated as finished and dropped from the rail. */
export const COMPLETE_RATIO = 0.95;

const SOURCES: Source[] = ["TMDB", "ANILIST", "OWN"];

export function entryKey(entry: Pick<ContinueEntry, "titleId" | "season" | "number">): string {
  return `${entry.titleId}:${entry.season ?? 0}:${entry.number ?? 0}`;
}

export function isComplete(entry: ContinueEntry): boolean {
  if (entry.durationSec === undefined || entry.durationSec <= 0) return false;
  return entry.positionSec / entry.durationSec >= COMPLETE_RATIO;
}

export function continuePercent(entry: ContinueEntry): number {
  if (entry.durationSec === undefined || entry.durationSec <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, entry.positionSec / entry.durationSec));
  return Math.round(ratio * 100);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function positiveInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function parseEntry(value: unknown): ContinueEntry | null {
  if (!isRecord(value)) return null;

  const titleId = optionalString(value.titleId);
  const slug = optionalString(value.slug);
  const title = optionalString(value.title);
  const source = SOURCES.find((candidate) => candidate === value.source);
  const kind = value.kind === "MOVIE" || value.kind === "SERIES" ? value.kind : undefined;
  const positionSec =
    typeof value.positionSec === "number" && Number.isFinite(value.positionSec)
      ? Math.max(0, value.positionSec)
      : undefined;
  const updatedAt =
    typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
      ? value.updatedAt
      : undefined;

  if (
    titleId === undefined ||
    slug === undefined ||
    title === undefined ||
    source === undefined ||
    kind === undefined ||
    positionSec === undefined ||
    updatedAt === undefined
  ) {
    return null;
  }

  const season = positiveInt(value.season);
  const number = positiveInt(value.number);
  const durationSec = positiveInt(value.durationSec);
  const posterUrl = optionalString(value.posterUrl);
  const episodeName = optionalString(value.episodeName);

  return {
    titleId,
    slug,
    source,
    kind,
    title,
    ...(posterUrl !== undefined ? { posterUrl } : {}),
    ...(season !== undefined ? { season } : {}),
    ...(number !== undefined ? { number } : {}),
    ...(episodeName !== undefined ? { episodeName } : {}),
    positionSec,
    ...(durationSec !== undefined ? { durationSec } : {}),
    updatedAt,
  };
}

function sortEntries(entries: ContinueEntry[]): ContinueEntry[] {
  return [...entries].sort(
    (a, b) => b.updatedAt - a.updatedAt || entryKey(a).localeCompare(entryKey(b)),
  );
}

export function readContinue(storage: ContinueStorage): ContinueEntry[] {
  let raw: string | null;
  try {
    raw = storage.getItem(CONTINUE_KEY);
  } catch {
    return [];
  }

  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return sortEntries(
      parsed
        .map(parseEntry)
        .filter((entry): entry is ContinueEntry => entry !== null)
        .filter((entry) => !isComplete(entry)),
    ).slice(0, CONTINUE_LIMIT);
  } catch {
    return [];
  }
}

export function writeContinue(storage: ContinueStorage, entries: ContinueEntry[]): void {
  try {
    storage.setItem(CONTINUE_KEY, JSON.stringify(sortEntries(entries).slice(0, CONTINUE_LIMIT)));
  } catch {
    // Storage can be unavailable (private mode, quota); the rail just stays empty.
  }
}

/**
 * Adds or replaces one entry. Entries that are effectively finished are removed
 * so the rail never sends viewers back to the credits.
 */
export function upsertContinue(entries: ContinueEntry[], next: ContinueEntry): ContinueEntry[] {
  const key = entryKey(next);
  const rest = entries.filter((entry) => entryKey(entry) !== key);

  if (isComplete(next) || next.positionSec < RESUME_MIN_SEC) {
    return sortEntries(rest).slice(0, CONTINUE_LIMIT);
  }

  return sortEntries([next, ...rest]).slice(0, CONTINUE_LIMIT);
}

export function removeContinue(entries: ContinueEntry[], key: string): ContinueEntry[] {
  return entries.filter((entry) => entryKey(entry) !== key);
}
