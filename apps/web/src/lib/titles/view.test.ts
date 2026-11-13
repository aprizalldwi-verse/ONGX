import { describe, expect, it } from "vitest";

import {
  formatDuration,
  localizedTitle,
  ratingOf,
  toPersonView,
  toTitleCard,
  toTitleDetail,
  type PersonWorkRow,
  type TitleCardRow,
  type TitleDetailRow,
} from "./view";

function card(overrides: Partial<TitleCardRow> = {}): TitleCardRow {
  return {
    id: "title-1",
    slug: "dune-2021",
    source: "TMDB",
    kind: "MOVIE",
    titleId: "Dune",
    titleEn: "Dune",
    titleNative: "Dune",
    posterPath: "/dune.jpg",
    year: 2021,
    rating: 8.04,
    trailerKey: "abc123",
    ...overrides,
  };
}

function detail(overrides: Partial<TitleDetailRow> = {}): TitleDetailRow {
  return {
    ...card(),
    synopsis: "A desert planet.",
    backdropPath: "/dune-backdrop.jpg",
    durationSec: 9_300,
    ageRating: "13+",
    country: "US",
    genres: [{ genre: { slug: "action", nameId: "Aksi", nameEn: "Action" } }],
    credits: [
      {
        role: "CAST",
        label: "Paul",
        position: 1,
        person: { slug: "timothee-chalamet", name: "Timothée Chalamet", imagePath: "/tc.jpg" },
      },
    ],
    offers: [
      {
        region: "ID",
        providerId: "netflix",
        providerName: "Netflix",
        offerType: "FLATRATE",
        url: "https://example.com/netflix",
        logoPath: "/netflix.png",
      },
      {
        region: "ID",
        providerId: "apple",
        providerName: "Apple TV",
        offerType: "RENT",
        url: "https://example.com/apple",
      },
    ],
    episodes: [],
    ...overrides,
  };
}

describe("localized titles", () => {
  it("prefers the Indonesian title and falls back to English", () => {
    expect(localizedTitle(card({ titleId: "Dune", titleEn: "Dune" }), "id")).toBe("Dune");
    expect(localizedTitle(card({ titleId: "", titleEn: "Dune", titleNative: "Dune" }), "id")).toBe(
      "Dune",
    );
    expect(localizedTitle(card({ titleId: "Dune", titleEn: "Dune (EN)" }), "en")).toBe("Dune (EN)");
  });

  it("uses a safe fallback for empty rows", () => {
    expect(localizedTitle(card({ titleId: "", titleEn: null, titleNative: null }), "id")).toBe(
      "Untitled",
    );
  });
});

describe("toTitleCard", () => {
  it("builds source-aligned paths and rounds ratings", () => {
    const movie = toTitleCard(card(), "id");
    expect(movie.href).toBe("/film/dune-2021");
    expect(movie.watchHref).toBe("/watch/title-1");
    expect(movie.rating).toBe(8);
    expect(movie.posterUrl).toContain("image.tmdb.org");

    const anime = toTitleCard(card({ source: "ANILIST", kind: "SERIES", slug: "frieren" }), "id");
    expect(anime.href).toBe("/anime/frieren");
  });

  it("keeps absolute image URLs untouched", () => {
    const anime = toTitleCard(
      card({ source: "ANILIST", posterPath: "https://s4.anilist.co/file/anilistcdn/x.jpg" }),
      "id",
    );
    expect(anime.posterUrl).toBe("https://s4.anilist.co/file/anilistcdn/x.jpg");
  });

  it("omits absent optional values", () => {
    const bare = toTitleCard(
      card({ rating: null, year: null, trailerKey: null, posterPath: "" }),
      "id",
    );
    expect(bare.rating).toBeUndefined();
    expect(bare.year).toBeUndefined();
    expect(bare.trailerKey).toBeUndefined();
    expect(bare.posterUrl).toBeUndefined();
  });
});

describe("toTitleDetail", () => {
  it("groups episodes by season, sorts them and keeps the title id in watch links", () => {
    const view = toTitleDetail(
      detail({
        kind: "SERIES",
        slug: "the-bear-2022",
        episodes: [
          {
            id: "e2",
            season: 1,
            number: 2,
            name: "Hands",
            durationSec: 1_800,
            stillPath: "/e2.jpg",
          },
          { id: "e1", season: 1, number: 1, name: "System", airDate: new Date("2022-06-23") },
          {
            id: "e3",
            season: 2,
            number: 1,
            name: "Beef",
            streamUrl: "https://cdn.example/e3.m3u8",
          },
        ],
      }),
      "id",
    );

    expect(view.seasons.map((season) => season.number)).toEqual([1, 2]);
    expect(view.seasons[0]?.episodes.map((episode) => episode.number)).toEqual([1, 2]);
    expect(view.seasons[0]?.episodes[0]?.watchHref).toBe("/watch/title-1?s=1&e=1");
    expect(view.seasons[1]?.episodes[0]?.hasStream).toBe(true);
    expect(view.seasons[1]?.episodes[0]?.streamUrl).toBe("https://cdn.example/e3.m3u8");
    expect(view.episodeCount).toBe(3);
  });

  it("propagates title stream URLs and sorts offers by type", () => {
    const view = toTitleDetail(
      detail({ streamUrl: "https://cdn.example/movie.m3u8", source: "OWN" }),
      "id",
    );

    expect(view.streamUrl).toBe("https://cdn.example/movie.m3u8");
    expect(view.hasOwnStream).toBe(true);
    expect(view.offers.map((offer) => offer.offerType)).toEqual(["FLATRATE", "RENT"]);
  });

  it("localizes genres and formats durations", () => {
    const view = toTitleDetail(detail(), "en");
    expect(view.genres[0]?.name).toBe("Action");
    expect(view.durationLabel).toBe("2h 35m");
    expect(toTitleDetail(detail(), "id").durationLabel).toBe("2j 35m");
  });
});

describe("small formatters", () => {
  it("rejects invalid ratings and durations", () => {
    expect(ratingOf(0)).toBeUndefined();
    expect(ratingOf(Number.NaN)).toBeUndefined();
    expect(formatDuration(0, "id")).toBeUndefined();
    expect(formatDuration(90, "en")).toBe("2m");
  });
});

describe("toPersonView", () => {
  it("dedupes repeated credits and sorts works by year", () => {
    const works: PersonWorkRow[] = [
      { ...card({ id: "a", slug: "a", year: 2020 }), role: "CAST", label: "Hero" },
      { ...card({ id: "b", slug: "b", year: 2024 }), role: "CREW", label: "Director" },
      { ...card({ id: "a", slug: "a", year: 2020 }), role: "CREW", label: "Writer" },
    ];

    const view = toPersonView(
      { slug: "person", name: "Person", imagePath: "/person.jpg", credits: works },
      "id",
    );

    expect(view.works.map((work) => work.id)).toEqual(["b", "a"]);
    expect(view.works[1]?.label).toBe("Hero");
  });
});
