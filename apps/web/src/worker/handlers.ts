import { runCatalogSync } from "@/lib/sync/catalog";
import { cleanupSyncHistory } from "@/lib/sync/cleanup";
import { consoleLogger } from "@/lib/sync/logger";
import { refreshTmdbOffers } from "@/lib/sync/offers";

import {
  JOB_NAMES,
  catalogSyncPayloadSchema,
  cleanupPayloadSchema,
  offersRefreshPayloadSchema,
  type CatalogSyncPayload,
  type CleanupPayload,
  type JobName,
  type OffersRefreshPayload,
} from "./jobs";

/**
 * Job handlers. Each one validates its payload first, so a malformed job fails
 * without touching Prisma or a provider API.
 */

export interface JobContext {
  /** BullMQ job id; `undefined` when a job is executed by `worker:once`. */
  jobId: string | undefined;
  attemptsMade: number;
}

export type JobResult = Record<string, unknown>;

interface Handler<TPayload> {
  (payload: TPayload, context: JobContext): Promise<JobResult>;
}

export interface JobHandlers {
  "sync.catalog": Handler<CatalogSyncPayload>;
  "sync.offers": Handler<OffersRefreshPayload>;
  "maintenance.cleanup": Handler<CleanupPayload>;
}

const handlers: JobHandlers = {
  [JOB_NAMES.catalogSync]: async (payload, context) => {
    const result = await runCatalogSync({
      tmdb: payload.tmdb,
      anilist: payload.anilist,
      force: payload.force,
      ...(payload.region !== undefined ? { region: payload.region } : {}),
      meta: {
        job: "sync.catalog",
        jobId: context.jobId ?? null,
        attempts: context.attemptsMade,
        trigger: "worker",
      },
    });

    return { tmdb: result.tmdb, anilist: result.anilist };
  },

  [JOB_NAMES.offersRefresh]: async (payload, context) => {
    const result = await refreshTmdbOffers({
      limit: payload.limit,
      maxAgeHours: payload.maxAgeHours,
      ...(payload.region !== undefined ? { region: payload.region } : {}),
      meta: { jobId: context.jobId ?? null, attempts: context.attemptsMade, trigger: "worker" },
    });

    return { ...result };
  },

  [JOB_NAMES.cleanup]: async (payload) => {
    const result = await cleanupSyncHistory({
      retentionDays: payload.retentionDays,
      logger: consoleLogger,
    });

    return { ...result };
  },
};

export async function runJob(
  name: JobName,
  data: unknown,
  context: JobContext,
): Promise<JobResult> {
  switch (name) {
    case JOB_NAMES.catalogSync:
      return handlers[name](catalogSyncPayloadSchema.parse(data), context);
    case JOB_NAMES.offersRefresh:
      return handlers[name](offersRefreshPayloadSchema.parse(data), context);
    case JOB_NAMES.cleanup:
      return handlers[name](cleanupPayloadSchema.parse(data), context);
  }
}
