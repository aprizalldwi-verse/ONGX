import { prisma } from "@ongx/db";

import { consoleLogger, type SyncLogger } from "./logger";

/**
 * Removes old `SyncJob` history so the worker's own audit trail does not grow
 * forever. BullMQ handles its own completed/failed retention; this only touches
 * rows the application writes.
 */

export interface CleanupOptions {
  /** Days of history to keep. 0 disables deletion. */
  retentionDays: number;
  now?: Date | undefined;
  logger?: SyncLogger | undefined;
}

export interface CleanupResult {
  deleted: number;
  cutoff: string;
}

export async function cleanupSyncHistory(options: CleanupOptions): Promise<CleanupResult> {
  const logger = options.logger ?? consoleLogger;
  const now = options.now ?? new Date();
  const cutoff = new Date(
    now.getTime() - Math.max(0, options.retentionDays) * 24 * 60 * 60 * 1_000,
  );

  if (options.retentionDays <= 0) {
    logger.info("[cleanup] retention disabled");
    return { deleted: 0, cutoff: cutoff.toISOString() };
  }

  const { count } = await prisma.syncJob.deleteMany({
    where: { startedAt: { lt: cutoff } },
  });

  logger.info(`[cleanup] deleted ${count} sync job(s) older than ${cutoff.toISOString()}`);

  return { deleted: count, cutoff: cutoff.toISOString() };
}
