import { describe, expect, it } from "vitest";

import {
  ADMIN_PAGE_SIZE,
  normalizeStreamUrl,
  parsePage,
  parseReportFilters,
  parseSyncFilters,
  parseTitleFilters,
} from "./validation";

describe("parsePage", () => {
  it("defaults to the first page for missing or invalid values", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("abc")).toBe(1);
  });

  it("accepts integers and the first value of an array", () => {
    expect(parsePage("4")).toBe(4);
    expect(parsePage(["7", "9"])).toBe(7);
  });

  it("clamps absurd pages so Prisma offsets stay bounded", () => {
    expect(parsePage("999999")).toBe(10_000);
  });
});

describe("parseTitleFilters", () => {
  it("returns search-friendly defaults", () => {
    expect(parseTitleFilters()).toEqual({ q: "", page: 1 });
    expect(ADMIN_PAGE_SIZE).toBe(20);
  });

  it("keeps known enum values and drops unknown ones", () => {
    expect(
      parseTitleFilters({ q: "  dune ", status: "LIVE", kind: "MOVIE", source: "OWN", page: "2" }),
    ).toEqual({ q: "dune", status: "LIVE", kind: "MOVIE", source: "OWN", page: 2 });

    expect(parseTitleFilters({ status: "HIDDEN", kind: "EPISODE", source: "PLEX" })).toEqual({
      q: "",
      page: 1,
    });
  });

  it("truncates long queries", () => {
    expect(parseTitleFilters({ q: "x".repeat(200) }).q).toHaveLength(80);
  });
});

describe("report and sync filters", () => {
  it("defaults report status to OPEN", () => {
    expect(parseReportFilters()).toEqual({ status: "OPEN", page: 1 });
    expect(parseReportFilters({ status: "RESOLVED" })).toEqual({ status: "RESOLVED", page: 1 });
    expect(parseReportFilters({ status: "SPAM" })).toEqual({ status: "OPEN", page: 1 });
  });

  it("omits an invalid sync status", () => {
    expect(parseSyncFilters()).toEqual({ page: 1 });
    expect(parseSyncFilters({ status: "FAILED", page: "3" })).toEqual({
      status: "FAILED",
      page: 3,
    });
  });
});

describe("normalizeStreamUrl", () => {
  it("accepts empty input as no stream", () => {
    expect(normalizeStreamUrl("   ")).toEqual({ ok: true, value: null });
  });

  it("accepts site-relative paths used by the HLS fixture", () => {
    expect(normalizeStreamUrl("/test/fixtures/hls/master.m3u8")).toEqual({
      ok: true,
      value: "/test/fixtures/hls/master.m3u8",
    });
  });

  it("accepts absolute http(s) URLs and normalizes them", () => {
    expect(normalizeStreamUrl("https://cdn.example.com/master.m3u8")).toEqual({
      ok: true,
      value: "https://cdn.example.com/master.m3u8",
    });
  });

  it("rejects protocol-relative and non-http schemes", () => {
    expect(normalizeStreamUrl("//evil.example/master.m3u8")).toEqual({
      ok: false,
      reason: "scheme",
    });
    expect(normalizeStreamUrl("javascript:alert(1)")).toEqual({ ok: false, reason: "scheme" });
    expect(normalizeStreamUrl("data:text/plain,hello")).toEqual({ ok: false, reason: "scheme" });
    expect(normalizeStreamUrl("ftp://example.com/master.m3u8")).toEqual({
      ok: false,
      reason: "scheme",
    });
  });

  it("rejects control characters and oversized values", () => {
    expect(normalizeStreamUrl("/a\nb.m3u8")).toEqual({ ok: false, reason: "scheme" });
    expect(normalizeStreamUrl(`https://example.com/${"a".repeat(2_100)}`)).toEqual({
      ok: false,
      reason: "too-long",
    });
  });
});
