import { describe, expect, it } from "vitest";

import { cacheKey, MemoryCache } from "./cache";

describe("MemoryCache", () => {
  it("returns values until the TTL expires", async () => {
    let now = 1_000;
    const cache = new MemoryCache(10, () => now);

    await cache.set("key", "value", 10);
    expect(await cache.get("key")).toBe("value");

    now += 9_999;
    expect(await cache.get("key")).toBe("value");

    now += 1;
    expect(await cache.get("key")).toBeNull();
  });

  it("ignores writes with a zero TTL", async () => {
    const cache = new MemoryCache();
    await cache.set("key", "value", 0);
    expect(await cache.get("key")).toBeNull();
  });

  it("evicts the oldest entries when full", async () => {
    const cache = new MemoryCache(2, () => 0);
    await cache.set("a", "1", 60);
    await cache.set("b", "2", 60);
    await cache.set("c", "3", 60);

    expect(cache.size).toBe(2);
    expect(await cache.get("a")).toBeNull();
    expect(await cache.get("c")).toBe("3");
  });

  it("can delete entries", async () => {
    const cache = new MemoryCache();
    await cache.set("a", "1", 60);
    await cache.del("a");
    expect(await cache.get("a")).toBeNull();
  });
});

describe("cacheKey", () => {
  it("sorts params so key order does not matter", () => {
    expect(cacheKey("tmdb:v1", "/discover/movie", { page: "1", sort_by: "x" })).toBe(
      cacheKey("tmdb:v1", "/discover/movie", { sort_by: "x", page: "1" }),
    );
  });

  it("omits the query string when there are no params", () => {
    expect(cacheKey("tmdb:v1", "/genre/movie/list", {})).toBe("tmdb:v1:/genre/movie/list");
  });
});
