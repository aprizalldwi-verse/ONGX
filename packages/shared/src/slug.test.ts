import { describe, expect, it } from "vitest";

import { buildTitleSlug, dedupeSlug, slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and dashes", () => {
    expect(slugify("The Last of Us")).toBe("the-last-of-us");
  });

  it("strips diacritics", () => {
    expect(slugify("Amélie  Kusuma")).toBe("amelie-kusuma");
  });

  it("drops punctuation and trims dashes", () => {
    expect(slugify("  Spider-Man: No Way Home!  ")).toBe("spider-man-no-way-home");
  });

  it("never returns empty", () => {
    expect(slugify("!!!")).toBe("untitled");
  });
});

describe("buildTitleSlug", () => {
  it("appends the year", () => {
    expect(buildTitleSlug("Dune: Part Two", 2024)).toBe("dune-part-two-2024");
  });

  it("omits missing year", () => {
    expect(buildTitleSlug("Dune", null)).toBe("dune");
  });

  it("ignores non-finite year", () => {
    expect(buildTitleSlug("Dune", Number.NaN)).toBe("dune");
  });
});

describe("dedupeSlug", () => {
  it("returns base when free", () => {
    expect(dedupeSlug("dune", () => false)).toBe("dune");
  });

  it("counts up until free", () => {
    const taken = new Set(["dune", "dune-2", "dune-3"]);
    expect(dedupeSlug("dune", (candidate) => taken.has(candidate))).toBe("dune-4");
  });
});
