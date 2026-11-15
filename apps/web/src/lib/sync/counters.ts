/**
 * Counters returned by every catalog sync. Kept in a standalone module so the
 * CLI and the worker report identical numbers.
 */

export interface SyncCounters {
  listed: number;
  created: number;
  updated: number;
  skipped: number;
  episodes: number;
  offers: number;
  failed: number;
}

export function createCounters(): SyncCounters {
  return { listed: 0, created: 0, updated: 0, skipped: 0, episodes: 0, offers: 0, failed: 0 };
}

export function mergeCounters(...parts: readonly SyncCounters[]): SyncCounters {
  return parts.reduce<SyncCounters>(
    (total, part) => ({
      listed: total.listed + part.listed,
      created: total.created + part.created,
      updated: total.updated + part.updated,
      skipped: total.skipped + part.skipped,
      episodes: total.episodes + part.episodes,
      offers: total.offers + part.offers,
      failed: total.failed + part.failed,
    }),
    createCounters(),
  );
}
