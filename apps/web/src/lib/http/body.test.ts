import { describe, expect, it } from "vitest";

import {
  contentLengthExceeds,
  isJsonContentType,
  JSON_BODY_LIMIT_BYTES,
  readJsonBody,
} from "./body";

function request(
  body: string,
  headers: Record<string, string> = { "content-type": "application/json" },
): Request {
  return new Request("http://localhost/api/report", { method: "POST", headers, body });
}

describe("isJsonContentType", () => {
  it("accepts application/json with an optional charset", () => {
    expect(isJsonContentType("application/json")).toBe(true);
    expect(isJsonContentType("application/json; charset=utf-8")).toBe(true);
    expect(isJsonContentType("Application/JSON")).toBe(true);
  });

  it("rejects missing, form and text payloads", () => {
    expect(isJsonContentType(null)).toBe(false);
    expect(isJsonContentType("application/x-www-form-urlencoded")).toBe(false);
    expect(isJsonContentType("text/plain")).toBe(false);
  });
});

describe("contentLengthExceeds", () => {
  it("compares numeric content-length values", () => {
    expect(contentLengthExceeds("2048", 1024)).toBe(true);
    expect(contentLengthExceeds("1024", 1024)).toBe(false);
    expect(contentLengthExceeds(null, 1024)).toBe(false);
    expect(contentLengthExceeds("not-a-number", 1024)).toBe(false);
  });
});

describe("readJsonBody", () => {
  it("parses a valid JSON body", async () => {
    expect(await readJsonBody(request('{"reason":"broken"}'))).toEqual({
      ok: true,
      value: { reason: "broken" },
    });
  });

  it("rejects unsupported content types with 415", async () => {
    const response = await readJsonBody(
      request('{"reason":"broken"}', { "content-type": "text/plain" }),
    );
    expect(response).toMatchObject({ ok: false, status: 415, error: "unsupported_media_type" });
  });

  it("rejects bodies over the cap with 413", async () => {
    const response = await readJsonBody(request(JSON.stringify({ message: "x".repeat(64) })), 32);
    expect(response).toMatchObject({ ok: false, status: 413, error: "too_large" });
  });

  it("rejects malformed JSON with 400", async () => {
    const response = await readJsonBody(request("{not json"));
    expect(response).toMatchObject({ ok: false, status: 400, error: "invalid" });
  });

  it("exposes a 16 KiB default limit", () => {
    expect(JSON_BODY_LIMIT_BYTES).toBe(16 * 1024);
  });
});
