import { describe, expect, it } from "vitest";

import { formatDateTime, formatDuration, jobKeyFromMeta, parseIsoDate } from "./format";

describe("parseIsoDate", () => {
  it("parses valid ISO strings and rejects garbage", () => {
    expect(parseIsoDate("2026-11-15T13:17:00.000Z")?.toISOString()).toBe(
      "2026-11-15T13:17:00.000Z",
    );
    expect(parseIsoDate(null)).toBeNull();
    expect(parseIsoDate("not-a-date")).toBeNull();
  });
});

describe("formatDateTime", () => {
  it("formats for the requested locale", () => {
    const date = new Date("2026-11-15T13:17:00.000Z");

    expect(formatDateTime("id", date)).toContain("2026");
    expect(formatDateTime("en", date)).toContain("2026");
  });

  it("renders a dash for missing values", () => {
    expect(formatDateTime("id", null)).toBe("—");
    expect(formatDateTime("en", undefined)).toBe("—");
  });
});

describe("formatDuration", () => {
  const start = new Date("2026-11-15T13:00:00.000Z");

  it("returns null while a job is still running", () => {
    expect(formatDuration(start, null)).toBeNull();
  });

  it("formats seconds and minutes", () => {
    expect(formatDuration(start, new Date("2026-11-15T13:00:45.000Z"))).toBe("45s");
    expect(formatDuration(start, new Date("2026-11-15T13:02:00.000Z"))).toBe("2m");
    expect(formatDuration(start, new Date("2026-11-15T13:02:30.000Z"))).toBe("2m 30s");
  });

  it("never returns a negative duration", () => {
    expect(formatDuration(start, new Date("2026-11-15T12:59:00.000Z"))).toBe("0s");
  });
});

describe("jobKeyFromMeta", () => {
  it("maps known producers", () => {
    expect(jobKeyFromMeta({ job: "sync.catalog" })).toBe("catalog");
    expect(jobKeyFromMeta({ job: "sync.offers" })).toBe("offers");
    expect(jobKeyFromMeta({ job: "maintenance.cleanup" })).toBe("cleanup");
    expect(jobKeyFromMeta({ job: "cli" })).toBe("cli");
    expect(jobKeyFromMeta({ job: "worker" })).toBe("worker");
  });

  it("falls back for unknown or malformed metadata", () => {
    expect(jobKeyFromMeta(null)).toBe("unknown");
    expect(jobKeyFromMeta("cli")).toBe("unknown");
    expect(jobKeyFromMeta({ job: 42 })).toBe("unknown");
    expect(jobKeyFromMeta({ job: "sync.everything" })).toBe("unknown");
  });
});
