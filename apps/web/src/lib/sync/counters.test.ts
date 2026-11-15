import { describe, expect, it } from "vitest";

import { createCounters, mergeCounters } from "./counters";

describe("sync counters", () => {
  it("starts every counter at zero and keeps fields independent", () => {
    const counters = createCounters();
    expect(counters).toEqual({
      listed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      episodes: 0,
      offers: 0,
      failed: 0,
    });
  });

  it("merges per-source results without losing failures", () => {
    const merged = mergeCounters(
      { ...createCounters(), listed: 10, created: 4, updated: 2, episodes: 30, offers: 8 },
      { ...createCounters(), listed: 5, skipped: 3, failed: 2, offers: 1 },
    );

    expect(merged).toEqual({
      listed: 15,
      created: 4,
      updated: 2,
      skipped: 3,
      episodes: 30,
      offers: 9,
      failed: 2,
    });
  });

  it("returns a fresh object when no parts are provided", () => {
    const merged = mergeCounters();
    expect(merged).toEqual(createCounters());
    expect(merged).not.toBe(createCounters());
  });
});
