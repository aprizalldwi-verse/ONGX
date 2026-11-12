import { describe, expect, it, vi } from "vitest";

import { MemoryCache } from "@/lib/cache";

import { parseRemoteRef, TmdbAdapter } from "./adapter";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const emptyMoviePage = {
  page: 1,
  results: [],
  total_pages: 1,
  total_results: 0,
};

describe("parseRemoteRef", () => {
  it("parses explicit prefixes", () => {
    expect(parseRemoteRef("movie:693134")).toEqual({ type: "movie", id: "693134" });
    expect(parseRemoteRef("tv:1396")).toEqual({ type: "tv", id: "1396" });
  });

  it("keeps bare ids unresolved", () => {
    expect(parseRemoteRef(" 693134 ")).toEqual({ type: undefined, id: "693134" });
    expect(parseRemoteRef("693134x")).toEqual({ type: undefined, id: "693134x" });
  });
});

describe("TmdbAdapter.listing", () => {
  it("translates filters into TMDB discover params", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(emptyMoviePage));
    const adapter = new TmdbAdapter({
      apiKey: "test-key",
      fetchImpl,
      cache: new MemoryCache(),
      sleep: async () => undefined,
      region: "ID",
    });

    await adapter.listing("MOVIE", { genre: "action", year: 2024, sort: "rating" }, 2);

    const url = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/3/discover/movie");
    expect(url.searchParams.get("with_genres")).toBe("28");
    expect(url.searchParams.get("primary_release_year")).toBe("2024");
    expect(url.searchParams.get("vote_count.gte")).toBe("200");
    expect(url.searchParams.get("sort_by")).toBe("vote_average.desc");
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("uses TV date fields for series", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ page: 1, results: [], total_pages: 1, total_results: 0 }),
    );
    const adapter = new TmdbAdapter({
      apiKey: "test-key",
      fetchImpl,
      cache: new MemoryCache(),
      sleep: async () => undefined,
    });

    await adapter.listing("SERIES", { year: 2023, sort: "newest" }, 1);

    const url = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/3/discover/tv");
    expect(url.searchParams.get("first_air_date_year")).toBe("2023");
    expect(url.searchParams.get("sort_by")).toBe("first_air_date.desc");
  });

  it("rejects episode-level listings", async () => {
    const adapter = new TmdbAdapter({ apiKey: "test-key", fetchImpl: vi.fn<typeof fetch>() });
    await expect(adapter.trending("EPISODE", 1)).rejects.toMatchObject({ kind: "client" });
  });
});

describe("TmdbAdapter.detail", () => {
  it("falls back from movie to TV for a bare id", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.startsWith("/3/movie/")) return jsonResponse({}, 404);
      return jsonResponse({
        id: 1396,
        name: "Breaking Bad",
        original_name: "Breaking Bad",
        first_air_date: "2008-01-20",
        poster_path: "/bb.jpg",
        original_language: "en",
      });
    });
    const adapter = new TmdbAdapter({
      apiKey: "test-key",
      fetchImpl,
      cache: new MemoryCache(),
      sleep: async () => undefined,
    });

    const title = await adapter.detail("1396");

    expect(title.kind).toBe("SERIES");
    expect(title.titleId).toBe("Breaking Bad");
    expect(title.slug).toBe("breaking-bad-2008");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("TmdbAdapter.offers", () => {
  it("returns an empty list when the region has no offers", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ results: {} }));
    const adapter = new TmdbAdapter({
      apiKey: "test-key",
      fetchImpl,
      cache: new MemoryCache(),
      sleep: async () => undefined,
    });

    await expect(adapter.offers("movie:101", "ID")).resolves.toEqual([]);
  });
});
