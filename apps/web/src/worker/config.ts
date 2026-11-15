import { CronExpressionParser } from "cron-parser";
import { z } from "zod";

/**
 * Worker configuration. Parsed from `process.env` at boot so a bad cron string
 * or an out-of-range concurrency fails immediately instead of at 03:00.
 */

const numberFromEnv = (fallback: number, min: number, max: number) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? fallback : value),
    z.coerce.number().int().min(min).max(max),
  );

const booleanFromEnv = (fallback: boolean) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? fallback : value === "true" || value === "1"),
    z.boolean(),
  );

const cronPattern = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    try {
      CronExpressionParser.parse(value);
      return true;
    } catch {
      return false;
    }
  }, "invalid cron expression");

const workerEnvSchema = z.object({
  REDIS_URL: z.string().trim().min(1, "REDIS_URL is required"),
  WORKER_CONCURRENCY: numberFromEnv(2, 1, 8),
  WORKER_QUEUE_PREFIX: z.string().trim().min(1).default("ongx"),
  WORKER_HEALTH_KEY: z.string().trim().min(1).default("ongx:worker:heartbeat"),
  WORKER_HEARTBEAT_MS: numberFromEnv(15_000, 5_000, 60_000),
  WORKER_CATALOG_CRON: cronPattern.default("0 2 * * *"),
  WORKER_OFFERS_CRON: cronPattern.default("0 */6 * * *"),
  WORKER_CLEANUP_CRON: cronPattern.default("30 3 * * *"),
  WORKER_SYNC_TMDB: numberFromEnv(100, 1, 2_000),
  WORKER_SYNC_ANILIST: numberFromEnv(60, 1, 2_000),
  WORKER_SYNC_FORCE: booleanFromEnv(false),
  WORKER_OFFERS_LIMIT: numberFromEnv(50, 1, 500),
  WORKER_OFFERS_MAX_AGE_HOURS: numberFromEnv(24, 1, 720),
  WORKER_RETENTION_DAYS: numberFromEnv(30, 0, 3_650),
  TMDB_REGION: z
    .string()
    .trim()
    .default("ID")
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{2}$/, "TMDB_REGION must be a two-letter country code")),
});

export interface WorkerConfig {
  redisUrl: string;
  concurrency: number;
  queuePrefix: string;
  healthKey: string;
  heartbeatMs: number;
  cron: {
    catalog: string;
    offers: string;
    cleanup: string;
  };
  catalog: {
    tmdb: number;
    anilist: number;
    force: boolean;
    region: string;
  };
  offers: {
    limit: number;
    maxAgeHours: number;
    region: string;
  };
  retentionDays: number;
}

export class WorkerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkerConfigError";
  }
}

export function parseWorkerConfig(input: Record<string, string | undefined>): WorkerConfig {
  const result = workerEnvSchema.safeParse(input);

  if (!result.success) {
    const lines = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `  - ${path}: ${issue.message}`;
    });

    throw new WorkerConfigError(`Invalid worker environment:\n${lines.join("\n")}`);
  }

  const env = result.data;

  return {
    redisUrl: env.REDIS_URL,
    concurrency: env.WORKER_CONCURRENCY,
    queuePrefix: env.WORKER_QUEUE_PREFIX,
    healthKey: env.WORKER_HEALTH_KEY,
    heartbeatMs: env.WORKER_HEARTBEAT_MS,
    cron: {
      catalog: env.WORKER_CATALOG_CRON,
      offers: env.WORKER_OFFERS_CRON,
      cleanup: env.WORKER_CLEANUP_CRON,
    },
    catalog: {
      tmdb: env.WORKER_SYNC_TMDB,
      anilist: env.WORKER_SYNC_ANILIST,
      force: env.WORKER_SYNC_FORCE,
      region: env.TMDB_REGION,
    },
    offers: {
      limit: env.WORKER_OFFERS_LIMIT,
      maxAgeHours: env.WORKER_OFFERS_MAX_AGE_HOURS,
      region: env.TMDB_REGION,
    },
    retentionDays: env.WORKER_RETENTION_DAYS,
  };
}

export function loadWorkerConfig(
  source: Record<string, string | undefined> = process.env,
): WorkerConfig {
  return parseWorkerConfig(source);
}
