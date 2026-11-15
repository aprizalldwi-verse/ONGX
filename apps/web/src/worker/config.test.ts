import { describe, expect, it } from "vitest";

import { parseWorkerConfig, WorkerConfigError } from "./config";

const minimal = { REDIS_URL: "redis://localhost:6379" };

describe("parseWorkerConfig", () => {
  it("applies safe defaults for a minimal environment", () => {
    const config = parseWorkerConfig(minimal);

    expect(config).toEqual({
      redisUrl: "redis://localhost:6379",
      concurrency: 2,
      queuePrefix: "ongx",
      healthKey: "ongx:worker:heartbeat",
      heartbeatMs: 15_000,
      cron: {
        catalog: "0 2 * * *",
        offers: "0 */6 * * *",
        cleanup: "30 3 * * *",
      },
      catalog: { tmdb: 100, anilist: 60, force: false, region: "ID" },
      offers: { limit: 50, maxAgeHours: 24, region: "ID" },
      retentionDays: 30,
    });
  });

  it("reads overrides and normalizes the region to uppercase", () => {
    const config = parseWorkerConfig({
      ...minimal,
      WORKER_CONCURRENCY: "4",
      WORKER_QUEUE_PREFIX: "stage",
      WORKER_CATALOG_CRON: "15 1 * * 1",
      WORKER_SYNC_TMDB: "25",
      WORKER_SYNC_ANILIST: "10",
      WORKER_SYNC_FORCE: "true",
      WORKER_OFFERS_LIMIT: "12",
      WORKER_OFFERS_MAX_AGE_HOURS: "6",
      WORKER_RETENTION_DAYS: "7",
      TMDB_REGION: "us",
    });

    expect(config.concurrency).toBe(4);
    expect(config.queuePrefix).toBe("stage");
    expect(config.cron.catalog).toBe("15 1 * * 1");
    expect(config.catalog).toEqual({ tmdb: 25, anilist: 10, force: true, region: "US" });
    expect(config.offers).toEqual({ limit: 12, maxAgeHours: 6, region: "US" });
    expect(config.retentionDays).toBe(7);
  });

  it("allows cleanup to be disabled with retention 0", () => {
    expect(parseWorkerConfig({ ...minimal, WORKER_RETENTION_DAYS: "0" }).retentionDays).toBe(0);
  });

  it("rejects a missing Redis URL with an actionable message", () => {
    expect(() => parseWorkerConfig({})).toThrow(WorkerConfigError);
    expect(() => parseWorkerConfig({})).toThrow(/REDIS_URL/);
  });

  it("rejects an invalid cron pattern before the worker starts", () => {
    expect(() => parseWorkerConfig({ ...minimal, WORKER_OFFERS_CRON: "every 6 hours" })).toThrow(
      /WORKER_OFFERS_CRON/,
    );
  });

  it("rejects concurrency outside the supported range", () => {
    expect(() => parseWorkerConfig({ ...minimal, WORKER_CONCURRENCY: "0" })).toThrow(
      /WORKER_CONCURRENCY/,
    );
    expect(() => parseWorkerConfig({ ...minimal, WORKER_CONCURRENCY: "9" })).toThrow(
      /WORKER_CONCURRENCY/,
    );
  });

  it("rejects a malformed region", () => {
    expect(() => parseWorkerConfig({ ...minimal, TMDB_REGION: "IDN" })).toThrow(/TMDB_REGION/);
  });
});
