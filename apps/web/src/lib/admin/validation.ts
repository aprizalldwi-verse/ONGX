import type { Kind, ReportStatus, Source, SyncStatus, TitleStatus } from "@ongx/db";

/**
 * Validation helpers shared by the admin pages (query strings) and the server
 * actions (form payloads). Nothing here touches Prisma or `next/headers`, so it
 * stays unit testable.
 */

export const TITLE_STATUSES = ["DRAFT", "LIVE", "BROKEN", "GONE"] as const;
export const REPORT_STATUSES = ["OPEN", "REVIEWING", "RESOLVED", "REJECTED"] as const;
export const SYNC_STATUSES = ["QUEUED", "RUNNING", "SUCCESS", "FAILED"] as const;
export const KINDS = ["MOVIE", "SERIES"] as const;
export const SOURCES = ["TMDB", "ANILIST", "OWN"] as const;

export const ADMIN_PAGE_SIZE = 20;
const MAX_PAGE = 10_000;
const MAX_QUERY_LENGTH = 80;

type ParamValue = string | string[] | undefined;

function first(value: ParamValue): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? "";
}

export function isTitleStatus(value: string): value is TitleStatus {
  return (TITLE_STATUSES as readonly string[]).includes(value);
}

export function isReportStatus(value: string): value is ReportStatus {
  return (REPORT_STATUSES as readonly string[]).includes(value);
}

export function isSyncStatus(value: string): value is SyncStatus {
  return (SYNC_STATUSES as readonly string[]).includes(value);
}

export function isKind(value: string): value is Extract<Kind, "MOVIE" | "SERIES"> {
  return (KINDS as readonly string[]).includes(value);
}

export function isSource(value: string): value is Source {
  return (SOURCES as readonly string[]).includes(value);
}

/** 1-based page clamp; ignores anything that is not a positive integer. */
export function parsePage(value: ParamValue): number {
  const parsed = Number.parseInt(first(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return Math.min(parsed, MAX_PAGE);
}

function normalizeQuery(value: ParamValue): string {
  return first(value).slice(0, MAX_QUERY_LENGTH);
}

export interface AdminTitleFilters {
  q: string;
  status?: TitleStatus;
  kind?: Extract<Kind, "MOVIE" | "SERIES">;
  source?: Source;
  page: number;
}

export function parseTitleFilters(input: Record<string, ParamValue> = {}): AdminTitleFilters {
  const status = first(input["status"]);
  const kind = first(input["kind"]);
  const source = first(input["source"]);

  return {
    q: normalizeQuery(input["q"]),
    ...(isTitleStatus(status) ? { status } : {}),
    ...(isKind(kind) ? { kind } : {}),
    ...(isSource(source) ? { source } : {}),
    page: parsePage(input["page"]),
  };
}

export interface AdminReportFilters {
  status: ReportStatus;
  page: number;
}

export function parseReportFilters(input: Record<string, ParamValue> = {}): AdminReportFilters {
  const status = first(input["status"]);
  return {
    status: isReportStatus(status) ? status : "OPEN",
    page: parsePage(input["page"]),
  };
}

export interface AdminSyncFilters {
  status?: SyncStatus;
  page: number;
}

export function parseSyncFilters(input: Record<string, ParamValue> = {}): AdminSyncFilters {
  const status = first(input["status"]);
  return {
    ...(isSyncStatus(status) ? { status } : {}),
    page: parsePage(input["page"]),
  };
}

export type StreamUrlResult =
  { ok: true; value: string | null } | { ok: false; reason: "scheme" | "too-long" };

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * Only relative paths and absolute http(s) URLs are allowed. Relative values
 * may not start with `//` (protocol-relative) or contain control characters.
 */
export function normalizeStreamUrl(raw: string): StreamUrlResult {
  const value = raw.trim();
  if (value.length === 0) return { ok: true, value: null };
  if (value.length > 2_048) return { ok: false, reason: "too-long" };
  if (hasControlCharacters(value)) return { ok: false, reason: "scheme" };

  if (value.startsWith("/")) {
    return value.startsWith("//") ? { ok: false, reason: "scheme" } : { ok: true, value };
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { ok: false, reason: "scheme" };
    }
    return { ok: true, value: url.toString() };
  } catch {
    return { ok: false, reason: "scheme" };
  }
}
