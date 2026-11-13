import { describe, expect, it } from "vitest";

import {
  addToPlaylist,
  isInPlaylist,
  isSaved,
  LIBRARY_LIMIT,
  PLAYLIST_KEY,
  readPlaylist,
  readSaved,
  removeFromPlaylist,
  SAVED_KEY,
  toLibraryCard,
  toLibraryEntry,
  toggleSaved,
  writePlaylist,
  writeSaved,
  type LibraryEntry,
  type LibraryStorage,
} from "./library";

function storage(
  initial: Record<string, string> = {},
): LibraryStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function entry(overrides: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    id: "title-1",
    slug: "one-piece-1999",
    source: "TMDB",
    kind: "SERIES",
    title: "One Piece",
    posterUrl: "https://image.tmdb.org/t/p/w342/poster.jpg",
    year: 1999,
    rating: 8.7,
    availableOnVidio: true,
    addedAt: 1_000,
    ...overrides,
  };
}

describe("toLibraryEntry", () => {
  it("drops undefined optional fields and stamps the added time", () => {
    const result = toLibraryEntry(
      {
        id: "title-1",
        slug: "one-piece-1999",
        source: "TMDB",
        kind: "SERIES",
        title: "One Piece",
        titleSecondary: undefined,
        posterUrl: undefined,
        year: undefined,
        rating: undefined,
        availableOnVidio: false,
      },
      42,
    );

    expect(result).toEqual({
      id: "title-1",
      slug: "one-piece-1999",
      source: "TMDB",
      kind: "SERIES",
      title: "One Piece",
      availableOnVidio: false,
      addedAt: 42,
    });
  });
});

describe("toLibraryCard", () => {
  it("rebuilds catalog and watch hrefs from the stored fields", () => {
    const card = toLibraryCard(entry());
    expect(card.href).toBe("/series/one-piece-1999");
    expect(card.watchHref).toBe("/watch/title-1");
    expect(card.availableOnVidio).toBe(true);

    expect(toLibraryCard(entry({ source: "ANILIST", kind: "MOVIE" })).href).toBe(
      "/anime/one-piece-1999",
    );
    expect(toLibraryCard(entry({ kind: "MOVIE" })).href).toBe("/film/one-piece-1999");
  });
});

describe("saved list", () => {
  it("writes and reads back in most-recent-first order", () => {
    const store = storage();
    writeSaved(store, [entry({ id: "a", addedAt: 1 }), entry({ id: "b", addedAt: 3 })]);

    expect(readSaved(store).map((item) => item.id)).toEqual(["b", "a"]);
    expect(store.data.has(SAVED_KEY)).toBe(true);
  });

  it("toggles an entry on and off", () => {
    const once = toggleSaved([], entry());
    expect(isSaved(once, "title-1")).toBe(true);

    const twice = toggleSaved(once, entry());
    expect(twice).toEqual([]);
  });

  it("caps the list", () => {
    const entries = Array.from({ length: LIBRARY_LIMIT }, (_, index) =>
      entry({ id: `title-${index}`, addedAt: index }),
    );
    const result = toggleSaved(entries, entry({ id: "new", addedAt: 5_000 }));

    expect(result).toHaveLength(LIBRARY_LIMIT);
    expect(result[0]?.id).toBe("new");
  });

  it("ignores corrupt or foreign JSON", () => {
    expect(readSaved(storage({ [SAVED_KEY]: "not json" }))).toEqual([]);
    expect(readSaved(storage({ [SAVED_KEY]: JSON.stringify([{ id: "x" }]) }))).toEqual([]);
    expect(readSaved(storage({ [SAVED_KEY]: JSON.stringify({}) }))).toEqual([]);
  });

  it("survives a storage that throws", () => {
    const broken: LibraryStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };

    expect(readSaved(broken)).toEqual([]);
    expect(() => writeSaved(broken, [entry()])).not.toThrow();
  });
});

describe("playlist", () => {
  it("adds idempotently and removes by id", () => {
    const added = addToPlaylist([], entry());
    expect(isInPlaylist(added, "title-1")).toBe(true);
    expect(addToPlaylist(added, entry())).toBe(added);

    const removed = removeFromPlaylist(added, "title-1");
    expect(removed).toEqual([]);
  });

  it("round-trips through storage", () => {
    const store = storage();
    writePlaylist(store, [entry()]);

    expect(store.data.has(PLAYLIST_KEY)).toBe(true);
    expect(readPlaylist(store)).toHaveLength(1);
  });
});
