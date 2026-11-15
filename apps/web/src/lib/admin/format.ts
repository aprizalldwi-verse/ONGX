/** Locale-aware date formatting for the admin tables. */
export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(locale: string, value: Date | null | undefined): string {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);
  } catch {
    return value.toISOString();
  }
}

export type AdminJobKey = "catalog" | "offers" | "cleanup" | "cli" | "worker" | "unknown";

const JOB_KEYS: Record<string, AdminJobKey> = {
  "sync.catalog": "catalog",
  "sync.offers": "offers",
  "maintenance.cleanup": "cleanup",
  cli: "cli",
  worker: "worker",
};

/**
 * `SyncJob.meta.job` is free-form JSON written by different producers (CLI,
 * worker handlers). Unknown values fall back to a neutral label instead of
 * leaking raw internals into the table.
 */
export function jobKeyFromMeta(meta: unknown): AdminJobKey {
  if (typeof meta !== "object" || meta === null || Array.isArray(meta)) return "unknown";

  const value = (meta as Record<string, unknown>)["job"];
  if (typeof value !== "string") return "unknown";

  return JOB_KEYS[value] ?? "unknown";
}

/** Compact duration between two timestamps; `null` while a job is still running. */
export function formatDuration(startedAt: Date, finishedAt: Date | null): string | null {
  if (!finishedAt) return null;

  const seconds = Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1_000));
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`;
}
