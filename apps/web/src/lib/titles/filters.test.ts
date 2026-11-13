import { describe, expect, it } from "vitest";

import { browseQuery, parseBrowseFilters } from "./filters";

describe("parseBrowseFilters", () => {
  it("defaults to page 1 and the supplied sort", () => {
    expect(parseBrowseFilters({})).toEqual({ sort: "popularity", page: 1 });
    expect(parseBrowseFilters({}, "newest")).toEqual({ sort: "newest", page: 1 });
  });

  it("accepts valid filters", () => {
    expect(
      parseBrowseFilters({ genre: "Action", year: "2024", sort: "rating", page: "3" }),
    ).toEqual({ genre: "action", year: 2024, sort: "rating", page: 3 });
  });

  it("ignores malformed values instead of throwing", () => {
    expect(
      parseBrowseFilters({ genre: "action<script>", year: "1200", sort: "nope", page: "-2" }),
    ).toEqual({ sort: "popularity", page: 1 });
  });

  it("caps absurd page numbers", () => {
    expect(parseBrowseFilters({ page: "9999" }).page).toBe(500);
  });

  it("uses the first value when a param repeats", () => {
    expect(parseBrowseFilters({ genre: ["comedy", "action"] }).genre).toBe("comedy");
  });

  it("accepts the Vidio provider filter and drops unknown providers", () => {
    expect(parseBrowseFilters({ provider: "Vidio" }).provider).toBe("vidio");
    expect(parseBrowseFilters({ provider: "netflix" }).provider).toBeUndefined();
  });
});

describe("browseQuery", () => {
  it("omits page 1 and preserves other filters", () => {
    expect(browseQuery({ genre: "action", year: 2024, sort: "rating", page: 1 })).toEqual({
      genre: "action",
      year: 2024,
      sort: "rating",
      page: undefined,
    });
  });

  it("applies overrides", () => {
    expect(
      browseQuery({ genre: "action", sort: "rating", page: 1 }, { page: 2, genre: undefined }),
    ).toEqual({ genre: undefined, sort: "rating", page: 2 });
  });

  it("preserves the provider filter across pages", () => {
    expect(browseQuery({ provider: "vidio", page: 1 }, { page: 3 })).toEqual({
      provider: "vidio",
      page: 3,
    });
  });
});
