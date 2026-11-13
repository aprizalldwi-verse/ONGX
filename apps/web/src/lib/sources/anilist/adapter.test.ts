import { describe, expect, it, vi } from "vitest";

import { MemoryCache } from "@/lib/cache";

import { AniListAdapter, parseAniListId } from "./adapter";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function media(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: { romaji: `Anime ${id}`, english: `Anime ${id}`, native: null },
    genres: ["Action"],
    coverImage: { extraLarge: `https://s4.anilist.co/${id}.jpg` },
    format: "TV",
    seasonYear: 2020,
    episodes: 12,
    duration: 24,
    averageScore: 80,
    popularity: 1000,
    ...overrides,
  };
}

function pageBody(items: unknown[]) {
  return {
    data: {
      Page: {
        pageInfo: { currentPage: 1, lastPage: 3, total: 60, hasNextPage: true },
        media: items,
      },
    },
  };
}

function createAdapter(fetchImpl: typeof fetch) {
  return new AniListAdapter({
    fetchImpl,
    cache: new MemoryCache(),
    sleep: async () => undefined,
  });
}

describe("parseAniListId", () => {
  it("accepts bare and prefixed ids", () => {
    expect(parseAniListId("16498")).toBe(16498);
    expect(parseAniListId("anilist:16498")).toBe(16498);
    expect(parseAniListId(" 16498 ")).toBe(16498);
  });

  it("rejects invalid ids", () => {
    expect(() => parseAniListId("abc")).toThrowError(/Invalid AniList id/);
    expect(() => parseAniListId("0")).toThrowError(/Invalid AniList id/);
  });
});

describe("AniListAdapter", () => {
  it("requests trending anime with the shared page size", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(pageBody([media(1)])));
    const adapter = createAdapter(fetchImpl);

    const page = await adapter.trending("SERIES", 2);

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(body.variables).toMatchObject({ page: 2, perPage: 20, sort: ["TRENDING_DESC"] });
    expect(page.items[0]?.source).toBe("ANILIST");
    expect(page.totalPages).toBe(3);
    expect(page.totalItems).toBe(60);
  });

  it("maps browse filters to AniList variables", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(pageBody([])));
    const adapter = createAdapter(fetchImpl);

    await adapter.listing("SERIES", { genre: "science-fiction", year: 2013, sort: "rating" }, 1);

    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)).variables).toMatchObject({
      genre: "Sci-Fi",
      seasonYear: 2013,
      sort: ["SCORE_DESC"],
    });
  });

  it("adds the MOVIE format when browsing anime movies", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(pageBody([])));
    const adapter = createAdapter(fetchImpl);

    await adapter.listing("MOVIE", {}, 1);

    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)).variables).toMatchObject({
      format: "MOVIE",
    });
  });

  it("throws not_found when the detail node is null", async () => {
    const adapter = createAdapter(
      vi.fn<typeof fetch>(async () => jsonResponse({ data: { Media: null } })),
    );

    await expect(adapter.detail("999")).rejects.toMatchObject({ kind: "not_found" });
  });

  it("returns recommendations and drops empty nodes", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        data: {
          Media: {
            recommendations: {
              nodes: [{ mediaRecommendation: media(2) }, { mediaRecommendation: null }],
            },
          },
        },
      }),
    );
    const adapter = createAdapter(fetchImpl);

    const related = await adapter.related("1", 1);

    expect(related).toHaveLength(1);
    expect(related[0]?.remoteId).toBe("2");
  });

  it("maps episodes and short-circuits seasons AniList does not expose", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        data: {
          Media: {
            episodes: 2,
            duration: 24,
            streamingEpisodes: [{ title: "Episode 1", thumbnail: "https://x/1.jpg" }],
          },
        },
      }),
    );
    const adapter = createAdapter(fetchImpl);

    const season1 = await adapter.episodes("1", 1);
    expect(season1).toHaveLength(1);
    expect(season1[0]?.number).toBe(1);

    await expect(adapter.episodes("1", 2)).resolves.toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns no offers because AniList has no regional availability", async () => {
    const adapter = createAdapter(vi.fn<typeof fetch>());
    await expect(adapter.offers("1", "ID")).resolves.toEqual([]);
  });
});
