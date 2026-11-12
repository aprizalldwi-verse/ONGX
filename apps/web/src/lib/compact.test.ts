import { describe, expect, it } from "vitest";

import { compact } from "./compact";

describe("compact", () => {
  it("removes undefined values but keeps null and falsy ones", () => {
    const result = compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 });

    expect(result).toEqual({ a: 1, c: null, d: "", e: false, f: 0 });
    expect("b" in result).toBe(false);
  });
});
