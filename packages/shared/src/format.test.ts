import { describe, expect, it } from "vitest";

import { formatDate, formatDuration, formatNumber } from "./format";

describe("formatDate", () => {
  it("formats per locale", () => {
    const value = new Date("2024-03-08T00:00:00Z");
    expect(formatDate(value, "id")).not.toBe("");
    expect(formatDate(value, "en")).not.toBe("");
    expect(formatDate(value, "id")).not.toBe(formatDate(value, "en"));
  });

  it("returns empty for invalid input", () => {
    expect(formatDate("not-a-date", "id")).toBe("");
  });
});

describe("formatDuration", () => {
  it("formats minutes only", () => {
    expect(formatDuration(95 * 60, "id")).toBe("1j 35m");
    expect(formatDuration(45 * 60, "en")).toBe("45 min");
  });

  it("rejects negative values", () => {
    expect(formatDuration(-1, "id")).toBe("");
  });
});

describe("formatNumber", () => {
  it("groups digits", () => {
    expect(formatNumber(1234, "en")).toBe("1,234");
    expect(formatNumber(1234, "id")).toBe("1.234");
  });
});
