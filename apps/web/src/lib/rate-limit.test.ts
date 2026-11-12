import { describe, expect, it } from "vitest";

import { evaluateFixedWindow } from "./rate-limit";

const WINDOW = 10_000;
const LIMIT = 40;

describe("evaluateFixedWindow", () => {
  it("allows the first request in a window", () => {
    const decision = evaluateFixedWindow(null, 0, LIMIT, WINDOW);
    expect(decision.allowed).toBe(true);
    expect(decision.retryAfterMs).toBe(0);
    expect(decision.next).toEqual({ windowStart: 0, count: 1 });
  });

  it("allows requests up to the limit and rejects the next one", () => {
    let state = { windowStart: 0, count: 0 };
    for (let i = 0; i < LIMIT; i += 1) {
      const decision = evaluateFixedWindow(state, 1_000, LIMIT, WINDOW);
      expect(decision.allowed).toBe(true);
      state = decision.next;
    }

    const rejected = evaluateFixedWindow(state, 1_000, LIMIT, WINDOW);
    expect(rejected.allowed).toBe(false);
    expect(rejected.retryAfterMs).toBe(WINDOW - 1_000);
    expect(rejected.next.count).toBe(LIMIT);
  });

  it("resets the counter when the window rolls over", () => {
    const state = { windowStart: 0, count: LIMIT };
    const decision = evaluateFixedWindow(state, WINDOW, LIMIT, WINDOW);

    expect(decision.allowed).toBe(true);
    expect(decision.next).toEqual({ windowStart: WINDOW, count: 1 });
  });

  it("aligns windows to the epoch, not the first request", () => {
    const decision = evaluateFixedWindow(null, 12_345, LIMIT, WINDOW);
    expect(decision.next.windowStart).toBe(10_000);
  });

  it("never reports a zero retry delay when rejected", () => {
    const decision = evaluateFixedWindow({ windowStart: 0, count: LIMIT }, 9_999, LIMIT, WINDOW);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterMs).toBe(1);
  });
});
