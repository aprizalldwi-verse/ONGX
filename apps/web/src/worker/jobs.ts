import type { JobsOptions } from "bullmq";
import { z } from "zod";

import type { WorkerConfig } from "./config";

/**
 * Queue contract: names, payload schemas and repeat schedules. Pure so the
 * worker boot path and the tests agree on every string.
 */

export const QUEUE_NAME = "ongx-jobs";

export const JOB_NAMES = {
  catalogSync: "sync.catalog",
  offersRefresh: "sync.offers",
  cleanup: "maintenance.cleanup",
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

const region = z
  .string()
  .regex(/^[A-Z]{2}$/, "region must be a two-letter country code")
  .optional();

export const catalogSyncPayloadSchema = z
  .object({
    tmdb: z.number().int().min(1).max(2_000),
    anilist: z.number().int().min(1).max(2_000),
    force: z.boolean(),
    region,
  })
  .strict();

export const offersRefreshPayloadSchema = z
  .object({
    limit: z.number().int().min(1).max(500),
    maxAgeHours: z.number().int().min(0).max(720),
    region,
  })
  .strict();

export const cleanupPayloadSchema = z
  .object({
    retentionDays: z.number().int().min(0).max(3_650),
  })
  .strict();

export type CatalogSyncPayload = z.infer<typeof catalogSyncPayloadSchema>;
export type OffersRefreshPayload = z.infer<typeof offersRefreshPayloadSchema>;
export type CleanupPayload = z.infer<typeof cleanupPayloadSchema>;
export type JobPayload = CatalogSyncPayload | OffersRefreshPayload | CleanupPayload;

/** Validates a job payload before any database or network work starts. */
export function parseJobPayload(name: JobName, data: unknown): JobPayload {
  switch (name) {
    case JOB_NAMES.catalogSync:
      return catalogSyncPayloadSchema.parse(data);
    case JOB_NAMES.offersRefresh:
      return offersRefreshPayloadSchema.parse(data);
    case JOB_NAMES.cleanup:
      return cleanupPayloadSchema.parse(data);
  }
}

export interface ScheduleDefinition {
  /** Stable id: re-running the worker updates the schedule instead of duplicating it. */
  schedulerId: string;
  name: JobName;
  pattern: string;
  payload: JobPayload;
}

export interface ScheduleSource {
  cron: WorkerConfig["cron"];
  catalog: WorkerConfig["catalog"];
  offers: WorkerConfig["offers"];
  retentionDays: number;
}

export function scheduleDefinitions(config: ScheduleSource): ScheduleDefinition[] {
  return [
    {
      schedulerId: "ongx:catalog-sync",
      name: JOB_NAMES.catalogSync,
      pattern: config.cron.catalog,
      payload: {
        tmdb: config.catalog.tmdb,
        anilist: config.catalog.anilist,
        force: config.catalog.force,
        region: config.catalog.region,
      },
    },
    {
      schedulerId: "ongx:offers-refresh",
      name: JOB_NAMES.offersRefresh,
      pattern: config.cron.offers,
      payload: {
        limit: config.offers.limit,
        maxAgeHours: config.offers.maxAgeHours,
        region: config.offers.region,
      },
    },
    {
      schedulerId: "ongx:sync-history-cleanup",
      name: JOB_NAMES.cleanup,
      pattern: config.cron.cleanup,
      payload: { retentionDays: config.retentionDays },
    },
  ];
}

/**
 * Three attempts with exponential backoff (1, 2, 4 minutes) absorb provider
 * blips. Completed jobs stay for a day, failures for a week, both capped so
 * Redis does not grow without bound.
 */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential", delay: 60_000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 100 },
  removeOnFail: { age: 7 * 24 * 60 * 60, count: 500 },
} satisfies JobsOptions;
