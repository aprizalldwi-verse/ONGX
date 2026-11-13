import { describe, expect, it } from "vitest";

import { localizedPath, toQueryString, withQuery } from "./paths";

describe("localizedPath", () => {
  it("keeps Indonesian paths unprefixed", () => {
    expect(localizedPath("id", "/film")).toBe("/film");
    expect(localizedPath("id", "film")).toBe("/film");
    expect(localizedPath("id", "/")).toBe("/");
  });

  it("prefixes English paths", () => {
    expect(localizedPath("en", "/film")).toBe("/en/film");
    expect(localizedPath("en", "/")).toBe("/en");
  });
});

describe("query helpers", () => {
  it("skips empty and undefined values", () => {
    expect(toQueryString({ page: 2, genre: undefined, sort: "" })).toBe("page=2");
    expect(toQueryString({})).toBe("");
  });

  it("appends a query string only when needed", () => {
    expect(withQuery("/film", {})).toBe("/film");
    expect(withQuery("/film", { page: 2 })).toBe("/film?page=2");
    expect(withQuery("/film", { genre: "action", page: 3 })).toBe("/film?genre=action&page=3");
  });
});
