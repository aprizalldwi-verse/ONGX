import { describe, expect, it, vi } from "vitest";

import { MemoryCache } from "@/lib/cache";

import { AniListClient, type AniListClientOptions } from "./client";
import { anilistGenresResponseSchema } from "./schemas";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

const genresBody = { data: { GenreCollection: ["Action", "Sci-Fi"] } };

function createClient(fetchImpl: typeof fetch, overrides: AniListClientOptions = {}) {
  return new AniListClient({
    fetchImpl,
    cache: new MemoryCache(),
    sleep: async () => undefined,
    ...overrides,
  });
}

describe("AniListClient", () => {
  it("retries a 429 and eventually returns the parsed payload", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({}, 429, { "retry-after": "0" }))
      .mockResolvedValueOnce(jsonResponse(genresBody));

    const client = createClient(fetchImpl);
    const data = await client.request(
      "Genres",
      "query Genres { GenreCollection }",
      {},
      anilistGenresResponseSchema,
      60,
    );

    expect(data.data.GenreCollection).toEqual(["Action", "Sci-Fi"]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("serves repeated calls from the cache", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(genresBody));
    const client = createClient(fetchImpl);

    await client.request("Genres", "q", {}, anilistGenresResponseSchema, 60);
    await client.request("Genres", "q", {}, anilistGenresResponseSchema, 60);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("acquires a rate-limit slot before each network call", async () => {
    const acquire = vi.fn(async () => undefined);
    const client = createClient(
      vi.fn<typeof fetch>(async () => jsonResponse(genresBody)),
      {
        limiter: { acquire },
      },
    );

    await client.request("Genres", "q", {}, anilistGenresResponseSchema, 60);

    expect(acquire).toHaveBeenCalledTimes(1);
  });

  it("maps GraphQL 'Not Found' errors to not_found", async () => {
    const client = createClient(
      vi.fn<typeof fetch>(async () =>
        jsonResponse({ data: { Media: null }, errors: [{ message: "Not Found.", status: 404 }] }),
      ),
    );

    await expect(
      client.request("Detail", "q", { id: 1 }, anilistGenresResponseSchema, 60),
    ).rejects.toMatchObject({ kind: "not_found" });
  });

  it("maps HTTP 404 to not_found", async () => {
    const client = createClient(vi.fn<typeof fetch>(async () => jsonResponse({}, 404)));

    await expect(
      client.request("Detail", "q", { id: 1 }, anilistGenresResponseSchema, 60),
    ).rejects.toMatchObject({ kind: "not_found" });
  });

  it("does not retry client errors", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ errors: [{ message: "Invalid query" }] }),
    );
    const client = createClient(fetchImpl);

    await expect(
      client.request("Detail", "q", { id: 1 }, anilistGenresResponseSchema, 60),
    ).rejects.toMatchObject({ kind: "client" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects payloads that do not match the schema", async () => {
    const client = createClient(
      vi.fn<typeof fetch>(async () => jsonResponse({ data: { GenreCollection: 42 } })),
    );

    await expect(
      client.request("Genres", "q", {}, anilistGenresResponseSchema, 60),
    ).rejects.toMatchObject({ kind: "parse" });
  });

  it("sends the operation and variables as JSON", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(genresBody));
    await createClient(fetchImpl).request(
      "Genres",
      "query { GenreCollection }",
      {},
      anilistGenresResponseSchema,
      60,
    );

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://graphql.anilist.co");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      query: "query { GenreCollection }",
      variables: {},
    });
  });
});
