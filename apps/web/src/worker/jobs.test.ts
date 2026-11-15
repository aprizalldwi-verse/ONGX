import { describe, expect, it } from "vitest";

import {
  DEFAULT_JOB_OPTIONS,
  JOB_NAMES,
  QUEUE_NAME,
  catalogSyncPayloadSchema,
  cleanupPayloadSchema,
  offersRefreshPayloadSchema,
  parseJobPayload,
  scheduleDefinitions,
} from "./jobs";

const config = {
  cron: {
    catalog: "0 2 * * *",
    offers: "0 */6 * * *",
    cleanup: "30 3 * * *",
  },
  catalog: { tmdb: 100, anilist: 60, force: false, region: "ID" },
  offers: { limit: 50, maxAgeHours: 24, region: "ID" },
  retentionDays: 30,
};

describe("job payloads", () => {
  it("accepts catalog payloads and rejects extra fields", () => {
    const payload = { tmdb: 10, anilist: 5, force: true, region: "US" };

    expect(catalogSyncPayloadSchema.parse(payload)).toEqual(payload);
    expect(() => catalogSyncPayloadSchema.parse({ ...payload, unexpected: true })).toThrow();
  });

  it("rejects a lowercase region on every payload", () => {
    expect(() =>
      catalogSyncPayloadSchema.parse({ tmdb: 10, anilist: 5, force: false, region: "id" }),
    ).toThrow();
    expect(() =>
      offersRefreshPayloadSchema.parse({ limit: 5, maxAgeHours: 1, region: "id" }),
    ).toThrow();
  });

  it("allows an offer refresh with maxAgeHours 0 (force refresh now)", () => {
    expect(offersRefreshPayloadSchema.parse({ limit: 5, maxAgeHours: 0 })).toEqual({
      limit: 5,
      maxAgeHours: 0,
    });
  });

  it("rejects out-of-range limits and negative retention", () => {
    expect(() => offersRefreshPayloadSchema.parse({ limit: 0, maxAgeHours: 24 })).toThrow();
    expect(() => cleanupPayloadSchema.parse({ retentionDays: -1 })).toThrow();
  });

  it("dispatches by job name", () => {
    expect(parseJobPayload(JOB_NAMES.cleanup, { retentionDays: 7 })).toEqual({
      retentionDays: 7,
    });
    expect(() => parseJobPayload(JOB_NAMES.cleanup, { retentionDays: "7" })).toThrow();
  });
});

describe("schedules", () => {
  it("registers one stable scheduler per job", () => {
    const definitions = scheduleDefinitions(config);

    expect(definitions.map((definition) => definition.schedulerId)).toEqual([
      "ongx:catalog-sync",
      "ongx:offers-refresh",
      "ongx:sync-history-cleanup",
    ]);
    expect(definitions.map((definition) => definition.name)).toEqual([
      JOB_NAMES.catalogSync,
      JOB_NAMES.offersRefresh,
      JOB_NAMES.cleanup,
    ]);
    expect(definitions.map((definition) => definition.pattern)).toEqual([
      "0 2 * * *",
      "0 */6 * * *",
      "30 3 * * *",
    ]);
  });

  it("passes configuration into each payload", () => {
    const [catalog, offers, cleanup] = scheduleDefinitions(config);

    expect(catalog?.payload).toEqual({ tmdb: 100, anilist: 60, force: false, region: "ID" });
    expect(offers?.payload).toEqual({ limit: 50, maxAgeHours: 24, region: "ID" });
    expect(cleanup?.payload).toEqual({ retentionDays: 30 });
  });
});

describe("job options", () => {
  it("retries three times with exponential backoff and bounded retention", () => {
    expect(DEFAULT_JOB_OPTIONS.attempts).toBe(3);
    expect(DEFAULT_JOB_OPTIONS.backoff).toEqual({ type: "exponential", delay: 60_000 });
    expect(DEFAULT_JOB_OPTIONS.removeOnComplete).toEqual({ age: 86_400, count: 100 });
    expect(DEFAULT_JOB_OPTIONS.removeOnFail).toEqual({ age: 604_800, count: 500 });
  });

  it("uses one queue name for producers and consumers", () => {
    expect(QUEUE_NAME).toBe("ongx-jobs");
  });
});
