import { describe, expect, it } from "vitest";

import { freeSlug, stripCollisionSuffix, titlePath } from "./slug";

describe("freeSlug", () => {
  it("returns the base when it is free", async () => {
    await expect(freeSlug("film-2024", async () => false)).resolves.toBe("film-2024");
  });

  it("appends the first available numeric suffix", async () => {
    const taken = new Set(["film-2024", "film-2024-2", "film-2024-3"]);
    await expect(freeSlug("film-2024", async (candidate) => taken.has(candidate))).resolves.toBe(
      "film-2024-4",
    );
  });
});

describe("stripCollisionSuffix", () => {
  it("removes a trailing collision suffix", () => {
    expect(stripCollisionSuffix("film-2024-2")).toBe("film-2024");
    expect(stripCollisionSuffix("film-2024")).toBe("film-2024");
  });

  it("keeps numbers that are part of the title or year", () => {
    expect(stripCollisionSuffix("blade-runner-2049-2017")).toBe("blade-runner-2049-2017");
    expect(stripCollisionSuffix("1917-2019")).toBe("1917-2019");
  });
});

describe("titlePath", () => {
  it("maps kinds to public routes", () => {
    expect(titlePath("MOVIE", "dune-2021")).toBe("/film/dune-2021");
    expect(titlePath("SERIES", "the-bear-2022")).toBe("/series/the-bear-2022");
  });
});
