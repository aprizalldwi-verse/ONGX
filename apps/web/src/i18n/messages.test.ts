import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import id from "../../messages/id.json";

type Json = Record<string, unknown>;

function flatten(value: Json, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix.length > 0 ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === "object" && !Array.isArray(child)) {
      return flatten(child as Json, path);
    }
    return [path];
  });
}

function leaves(value: Json, prefix = ""): Array<[string, unknown]> {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix.length > 0 ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === "object" && !Array.isArray(child)) {
      return leaves(child as Json, path);
    }
    return [[path, child] as [string, unknown]];
  });
}

describe("messages", () => {
  it("id and en expose exactly the same keys", () => {
    expect(flatten(en as Json).sort()).toEqual(flatten(id as Json).sort());
  });

  it("has no empty strings", () => {
    const empty = [leaves(en as Json), leaves(id as Json)]
      .flat()
      .filter(([, value]) => typeof value === "string" && value.trim().length === 0)
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });

  it("keeps ICU placeholders aligned across locales", () => {
    const placeholders = (value: unknown): string[] =>
      typeof value === "string" ? [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? "") : [];

    const enLeaves = new Map(leaves(en as Json));
    for (const [key, value] of leaves(id as Json)) {
      expect(placeholders(value).sort(), key).toEqual(placeholders(enLeaves.get(key)).sort());
    }
  });
});
