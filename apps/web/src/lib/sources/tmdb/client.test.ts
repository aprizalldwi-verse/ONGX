import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { MemoryCache } from "@/lib/cache";

import { TmdbClient, TmdbError, type TmdbClientOptions } from "./client";

const schema = z.object({ ok: z.boolean(), id: z.number().optional() });

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function createClient(
  fetchImpl: typeof fetch,
  overrides: Partial<TmdbClientOptions> = {},
): TmdbClient {
  return new TmdbClient({
    apiKey: "test-key",
    fetchImpl,
    cache: new MemoryCache(),
    sleep: async () => undefined,
    random: () => 0,
    ...overrides,
  });
}

describe("TmdbClient", () => {
  it("fails fast without an API key", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const client = new TmdbClient({ apiKey: "", fetchImpl });

    await expect(client.get("/movie/1", {}, schema, 60)).rejects.toMatchObject({
      kind: "config",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns validated data and serves repeat calls from cache", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ ok: true }));
    const client = createClient(fetchImpl);

    await expect(client.get("/movie/1", { page: 1 }, schema, 60)).resolves.toEqual({ ok: true });
    await expect(client.get("/movie/1", { page: 1 }, schema, 60)).resolves.toEqual({ ok: true });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("sends language plus params, and the API key as a query parameter", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ ok: true }));
    const client = createClient(fetchImpl);

    await client.get("/discover/movie", { page: 2, sort_by: "popularity.desc" }, schema, 60);

    const url = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(url.searchParams.get("language")).toBe("id-ID");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("sort_by")).toBe("popularity.desc");
    expect(url.searchParams.get("api_key")).toBe("test-key");
  });

  it("uses a bearer header for v4 read tokens", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ ok: true }));
    const client = createClient(fetchImpl, { apiKey: "eyJhbGciOi.test.token" });

    await client.get("/movie/1", {}, schema, 60);

    const init = fetchImpl.mock.calls[0]?.[1];
    const url = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect((init?.headers as Record<string, string>).authorization).toBe(
      "Bearer eyJhbGciOi.test.token",
    );
    expect(url.searchParams.get("api_key")).toBeNull();
  });

  it("retries 5xx responses with exponential backoff", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => undefined);
    const client = createClient(fetchImpl, { sleep });

    await expect(client.get("/movie/1", {}, schema, 60)).resolves.toEqual({ ok: true });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([400, 800]);
  });

  it("honours Retry-After on 429", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({}, 429, { "retry-after": "2" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const sleep = vi.fn(async () => undefined);
    const client = createClient(fetchImpl, { sleep });

    await client.get("/movie/1", {}, schema, 60);

    expect(sleep).toHaveBeenCalledWith(2_000);
  });

  it("does not retry 404 responses", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({}, 404));
    const client = createClient(fetchImpl);

    await expect(client.get("/movie/404", {}, schema, 60)).rejects.toMatchObject({
      kind: "not_found",
      retryable: false,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps 401 to a non-retryable config error", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({}, 401));
    const client = createClient(fetchImpl);

    await expect(client.get("/movie/1", {}, schema, 60)).rejects.toMatchObject({ kind: "config" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("fails on payloads that do not match the schema", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ unexpected: true }));
    const client = createClient(fetchImpl);

    const error = await client.get("/movie/1", {}, schema, 60).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(TmdbError);
    expect((error as TmdbError).kind).toBe("parse");
  });

  it("retries network failures and surfaces the last error", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    const client = createClient(fetchImpl);

    const error = await client.get("/movie/1", {}, schema, 60).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(TmdbError);
    expect((error as TmdbError).kind).toBe("network");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
