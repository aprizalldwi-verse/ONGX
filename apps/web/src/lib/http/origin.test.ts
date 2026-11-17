import { describe, expect, it } from "vitest";

import { isSameOrigin } from "./origin";

function headers(values: Record<string, string>): Headers {
  return new Headers(values);
}

describe("isSameOrigin", () => {
  it("allows non-browser requests without an Origin header", () => {
    expect(isSameOrigin(headers({ host: "ongx.example" }))).toBe(true);
  });

  it("accepts an origin whose host matches the request host", () => {
    expect(isSameOrigin(headers({ host: "ongx.example", origin: "https://ongx.example" }))).toBe(
      true,
    );
    expect(isSameOrigin(headers({ host: "localhost:3000", origin: "http://localhost:3000" }))).toBe(
      true,
    );
  });

  it("rejects a different host, scheme-like origin and malformed values", () => {
    expect(isSameOrigin(headers({ host: "ongx.example", origin: "https://evil.example" }))).toBe(
      false,
    );
    expect(isSameOrigin(headers({ host: "ongx.example", origin: "null" }))).toBe(false);
    expect(isSameOrigin(headers({ host: "ongx.example", origin: "not a url" }))).toBe(false);
    expect(isSameOrigin(headers({ host: "ongx.example", origin: "ftp://ongx.example" }))).toBe(
      false,
    );
  });

  it("rejects when the request has no host header", () => {
    expect(isSameOrigin(headers({ origin: "https://ongx.example" }))).toBe(false);
  });

  it("compares hosts only, so TLS termination behind a proxy still works", () => {
    expect(isSameOrigin(headers({ host: "ongx.example", origin: "http://ongx.example" }))).toBe(
      true,
    );
  });
});
