import { describe, expect, it } from "vitest";

import { GENRES, genreSlugs } from "./genres";

describe("GENRES", () => {
  it("seeds exactly 24 genres", () => {
    expect(GENRES).toHaveLength(24);
  });

  it("has unique slugs", () => {
    const slugs = genreSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has unique TMDB ids", () => {
    const ids = GENRES.map((genre) => genre.tmdbId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("fills both locale names", () => {
    for (const genre of GENRES) {
      expect(genre.nameId.trim().length).toBeGreaterThan(0);
      expect(genre.nameEn.trim().length).toBeGreaterThan(0);
      expect(genre.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
