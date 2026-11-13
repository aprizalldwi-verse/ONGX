import { describe, expect, it } from "vitest";

import {
  COMPLETE_RATIO,
  CONTINUE_KEY,
  CONTINUE_LIMIT,
  continuePercent,
  entryKey,
  isComplete,
  readContinue,
  removeContinue,
  upsertContinue,
  writeContinue,
  type ContinueEntry,
  type ContinueStorage,
} from "./continue-watching";

function memoryStorage(seed?: string): ContinueStorage & { value: () => string | null } {
  let value: string | null = seed ?? null;
  return {
    getItem: (key) => (key === CONTINUE_KEY ? value : null),
    setItem: (key, next) => {
      if (key === CONTINUE_KEY) value = next;
    },
    value: () => value,
  };
}

function entry(overrides: Partial<ContinueEntry> = {}): ContinueEntry {
  return {
    titleId: "title-1",
    slug: "dune-2021",
    source: "TMDB",
    kind: "MOVIE",
    title: "Dune",
    positionSec: 120,
    durationSec: 600,
    updatedAt: 1_000,
    ...overrides,
  };
}

describe("continue-watching storage", () => {
  it("returns an empty list for missing or corrupt data", () => {
    expect(readContinue(memoryStorage())).toEqual([]);
    expect(readContinue(memoryStorage("{not json"))).toEqual([]);
    expect(readContinue(memoryStorage(JSON.stringify({ titleId: "x" })))).toEqual([]);
  });

  it("drops malformed entries and keeps valid ones", () => {
    const raw = JSON.stringify([
      {
        titleId: "a",
        slug: "a",
        source: "TMDB",
        kind: "MOVIE",
        title: "A",
        positionSec: 30,
        updatedAt: 1,
      },
      { titleId: "b", source: "NOPE", kind: "MOVIE", title: "B", positionSec: 30, updatedAt: 1 },
    ]);

    const entries = readContinue(memoryStorage(raw));
    expect(entries).toHaveLength(1);
    expect(entries[0]?.titleId).toBe("a");
  });

  it("round-trips entries through write/read and caps the list", () => {
    const storage = memoryStorage();
    const entries = Array.from({ length: CONTINUE_LIMIT + 5 }, (_, index) =>
      entry({ titleId: `title-${index}`, updatedAt: index }),
    );

    writeContinue(storage, entries);
    const restored = readContinue(storage);

    expect(restored).toHaveLength(CONTINUE_LIMIT);
    expect(restored[0]?.titleId).toBe(`title-${CONTINUE_LIMIT + 4}`);
  });
});

describe("continue-watching rules", () => {
  it("keys entries by title and episode", () => {
    expect(entryKey(entry())).toBe("title-1:0:0");
    expect(entryKey(entry({ season: 2, number: 3 }))).toBe("title-1:2:3");
  });

  it("treats near-finished entries as complete", () => {
    expect(isComplete(entry({ positionSec: 600 * COMPLETE_RATIO, durationSec: 600 }))).toBe(true);
    expect(isComplete(entry({ positionSec: 60, durationSec: 600 }))).toBe(false);
    expect(isComplete(entry({ durationSec: undefined }))).toBe(false);
  });

  it("computes a clamped percentage", () => {
    expect(continuePercent(entry({ positionSec: 150, durationSec: 600 }))).toBe(25);
    expect(continuePercent(entry({ positionSec: 900, durationSec: 600 }))).toBe(100);
    expect(continuePercent(entry({ durationSec: undefined }))).toBe(0);
  });

  it("replaces the same episode and sorts by recency", () => {
    const first = entry({ titleId: "a", updatedAt: 1 });
    const second = entry({ titleId: "b", updatedAt: 2 });
    const updated = entry({ titleId: "a", positionSec: 300, updatedAt: 3 });

    const next = upsertContinue([first, second], updated);
    expect(next.map((item) => item.titleId)).toEqual(["a", "b"]);
    expect(next[0]?.positionSec).toBe(300);
  });

  it("drops entries that are barely started or effectively finished", () => {
    const existing = [entry({ titleId: "a" })];

    expect(upsertContinue(existing, entry({ titleId: "b", positionSec: 3 }))).toHaveLength(1);
    expect(
      upsertContinue(existing, entry({ titleId: "b", positionSec: 595, durationSec: 600 })),
    ).toHaveLength(1);
  });

  it("removes an entry by key", () => {
    const entries = [entry({ titleId: "a" }), entry({ titleId: "b" })];
    expect(removeContinue(entries, entryKey(entry({ titleId: "a" })))).toHaveLength(1);
  });
});
