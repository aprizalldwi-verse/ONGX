import { describe, expect, it } from "vitest";

import { MemoryCache } from "@/lib/cache";
import { TmdbAdapter } from "@/lib/sources/tmdb/adapter";

/**
 * Manual live smoke: hits six TMDB endpoints once (budget is 40 req / 10 s).
 * Run with `pnpm tmdb:smoke`; skipped automatically when TMDB_API_KEY is empty.
 */

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local is optional here; CI passes env vars directly.
}

const apiKey = process.env.TMDB_API_KEY?.trim() ?? "";

describe.skipIf(apiKey.length === 0)("TMDB live smoke", () => {
  const adapter = new TmdbAdapter({ apiKey, region: process.env.TMDB_REGION ?? "ID" });

  it("reads genres, trending, discover, search, detail and offers", async () => {
    const genres = await adapter.genres();
    expect(genres.length).toBeGreaterThan(0);

    const trending = await adapter.trending("MOVIE", 1);
    expect(trending.items.length).toBeGreaterThan(0);
    expect(trending.items[0]?.posterPath.startsWith("/")).toBe(true);

    const listing = await adapter.listing(
      "MOVIE",
      { genre: "action", sort: "popularity", year: 2024 },
      1,
    );
    expect(listing.page).toBe(1);

    const search = await adapter.search("dune", 1);
    expect(search.items.length).toBeGreaterThan(0);

    const detail = await adapter.detail("movie:693134");
    expect(detail.slug.length).toBeGreaterThan(0);
    expect(detail.kind).toBe("MOVIE");

    const offers = await adapter.offers("movie:693134", "ID");
    expect(Array.isArray(offers)).toBe(true);

    console.info(
      `[smoke] ok — genres=${genres.length} trending=${trending.items.length} listing=${listing.items.length} search=${search.items.length} offers=${offers.length}`,
    );
  });

  it("shares the response cache between calls", async () => {
    const cached = new TmdbAdapter({
      apiKey,
      region: "ID",
      cache: new MemoryCache(),
    });

    const first = await cached.genres();
    const second = await cached.genres();
    expect(second).toEqual(first);
  });
});
