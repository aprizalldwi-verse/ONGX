import { describe, expect, it } from "vitest";

import {
  isSearchable,
  normalizeSearchQuery,
  searchCacheKey,
  searchQuerySchema,
  searchResponseSchema,
  toSearchResponse,
  SEARCH_MAX_LENGTH,
} from "./search";
import type { TitleCardView } from "./titles/view";

function card(overrides: Partial<TitleCardView> = {}): TitleCardView {
  return {
    id: "title-1",
    slug: "one-piece-1999",
    href: "/series/one-piece-1999",
    watchHref: "/watch/title-1",
    title: "One Piece",
    posterUrl: "https://image.tmdb.org/t/p/w342/poster.jpg",
    year: 1999,
    rating: 8.7,
    kind: "SERIES",
    source: "TMDB",
    availableOnVidio: true,
    ...overrides,
  };
}

describe("normalizeSearchQuery", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizeSearchQuery("  one   piece  ")).toBe("one piece");
    expect(normalizeSearchQuery("\tattack\non titan ")).toBe("attack on titan");
  });

  it("caps very long queries", () => {
    expect(normalizeSearchQuery("a".repeat(SEARCH_MAX_LENGTH + 20))).toHaveLength(
      SEARCH_MAX_LENGTH,
    );
  });
});

describe("isSearchable", () => {
  it("requires at least two characters after normalization", () => {
    expect(isSearchable("a")).toBe(false);
    expect(isSearchable("  a  ")).toBe(false);
    expect(isSearchable("ab")).toBe(true);
    expect(isSearchable(" one ")).toBe(true);
  });
});

describe("searchQuerySchema", () => {
  it("accepts a trimmed query", () => {
    expect(searchQuerySchema.parse({ q: "  dune " })).toEqual({ q: "dune" });
  });

  it("rejects empty, short and oversized queries", () => {
    expect(searchQuerySchema.safeParse({ q: "" }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: "a" }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: "a".repeat(SEARCH_MAX_LENGTH + 1) }).success).toBe(
      false,
    );
  });

  it("rejects unknown keys", () => {
    expect(searchQuerySchema.safeParse({ q: "dune", limit: 5 }).success).toBe(false);
  });
});

describe("searchCacheKey", () => {
  it("is locale-aware, normalized and case-insensitive", () => {
    expect(searchCacheKey("  One   Piece ", "id")).toBe("ongx:search:v1:id:one piece");
    expect(searchCacheKey("one piece", "en")).toBe("ongx:search:v1:en:one piece");
  });
});

describe("toSearchResponse", () => {
  it("normalizes the echoed query and keeps the cards", () => {
    const response = toSearchResponse("  One   Piece ", [card()]);
    expect(response.query).toBe("One Piece");
    expect(response.items).toHaveLength(1);
  });

  it("round-trips through the wire schema", () => {
    const response = toSearchResponse("dune", [card({ availableOnVidio: false })]);
    const parsed = searchResponseSchema.parse(JSON.parse(JSON.stringify(response)));

    expect(parsed.items[0]?.slug).toBe("one-piece-1999");
    expect(parsed.items[0]?.availableOnVidio).toBe(false);
  });

  it("drops malformed items instead of throwing on the client", () => {
    const result = searchResponseSchema.safeParse({
      query: "dune",
      items: [{ id: "x" }, card()],
    });

    expect(result.success).toBe(false);
  });
});
