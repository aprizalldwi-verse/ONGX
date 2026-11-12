import { describe, expect, it } from "vitest";

import { uniqueCredits, uniqueGenres } from "./dedupe";

describe("uniqueGenres", () => {
  it("dedupes by TMDB id", () => {
    const genres = uniqueGenres([
      { slug: "action", nameId: "Aksi", nameEn: "Action", tmdbId: 28 },
      { slug: "action-dup", nameId: "Aksi", nameEn: "Action", tmdbId: 28 },
      { slug: "drama", nameId: "Drama", nameEn: "Drama" },
      { slug: "drama", nameId: "Drama", nameEn: "Drama" },
    ]);

    expect(genres.map((genre) => genre.slug)).toEqual(["action", "drama"]);
  });
});

describe("uniqueCredits", () => {
  it("dedupes by person, role and label and renumbers positions", () => {
    const credits = uniqueCredits([
      { slug: "a", name: "A", tmdbId: 1, role: "CAST", label: "Hero", position: 9 },
      { slug: "a", name: "A", tmdbId: 1, role: "CAST", label: "Hero", position: 10 },
      { slug: "a", name: "A", tmdbId: 1, role: "CAST", label: "Villain", position: 11 },
      { slug: "a", name: "A", tmdbId: 1, role: "CREW", label: "Director", position: 12 },
    ]);

    expect(credits).toHaveLength(3);
    expect(credits.map((person) => person.position)).toEqual([0, 1, 2]);
    expect(credits[2]?.role).toBe("CREW");
  });

  it("falls back to the slug when there is no TMDB id", () => {
    const credits = uniqueCredits([
      { slug: "someone", name: "Someone", role: "CAST" },
      { slug: "someone", name: "Someone", role: "CAST" },
    ]);

    expect(credits).toHaveLength(1);
  });
});
