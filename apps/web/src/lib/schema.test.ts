import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { EpisodeView, TitleDetailView } from "@/lib/titles/view";

import {
  breadcrumbSchema,
  episodeSchema,
  personSchema,
  serializeJsonLd,
  titleSchema,
  websiteSchema,
} from "./schema";

const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://ongx.test";
});

afterAll(() => {
  if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
});

const episode: EpisodeView = {
  id: "e1",
  season: 1,
  number: 2,
  name: "Pilot",
  synopsis: "Episode pembuka.",
  airDate: "2024-01-02T00:00:00.000Z",
  airDateLabel: "2 Jan 2024",
  durationSec: 1_500,
  durationLabel: "25m",
  stillUrl: "https://img.example/still.jpg",
  href: "/series/attack/s/1/e/2",
  watchHref: "/watch/t1?s=1&e=2",
  hasStream: false,
};

const series: TitleDetailView = {
  id: "t1",
  slug: "attack",
  href: "/series/attack",
  watchHref: "/watch/t1",
  title: "Attack",
  titleSecondary: "進撃",
  posterUrl: "https://img.example/poster.jpg",
  year: 2024,
  rating: 8.4,
  kind: "SERIES",
  source: "TMDB",
  trailerKey: "abc",
  availableOnVidio: true,
  synopsis: "Sinopsis panjang.",
  backdropUrl: "https://img.example/backdrop.jpg",
  durationLabel: "25m",
  ageRating: "13+",
  country: "JP",
  genres: [{ slug: "action", name: "Aksi", href: "/genre/action" }],
  cast: [{ slug: "person", name: "Actor", href: "/orang/person" }],
  crew: [],
  offers: [],
  seasons: [{ number: 1, episodes: [episode] }],
  episodeCount: 1,
  hasOwnStream: false,
};

describe("JSON-LD serialization", () => {
  it("escapes characters that could terminate the script tag", () => {
    const json = serializeJsonLd({ name: "</script><script>alert(1)</script> & co" });

    expect(json).not.toContain("</script>");
    expect(json).toContain("\\u003c/script\\u003e");
    expect(json).toContain("\\u0026");
  });
});

describe("titleSchema", () => {
  it("emits a TVSeries with rating, genres and cast", () => {
    const schema = titleSchema(series, {
      url: "https://ongx.test/series/attack",
      locale: "id",
    });

    expect(schema).toMatchObject({
      "@type": "TVSeries",
      name: "Attack",
      url: "https://ongx.test/series/attack",
      inLanguage: "id",
      numberOfEpisodes: 1,
      numberOfSeasons: 1,
      genre: ["Aksi"],
      aggregateRating: { ratingValue: 8.4, bestRating: 10 },
    });
    expect(schema.actor).toEqual([
      {
        "@type": "Person",
        name: "Actor",
        url: "https://ongx.test/orang/person",
      },
    ]);
  });

  it("emits a Movie for film sources", () => {
    const schema = titleSchema(
      { ...series, kind: "MOVIE", source: "TMDB", href: "/film/attack" },
      { url: "https://ongx.test/film/attack", locale: "en" },
    );

    expect(schema["@type"]).toBe("Movie");
    expect(schema["@type"]).not.toBe("TVSeries");
    expect(schema).not.toHaveProperty("numberOfEpisodes");
    expect(schema.inLanguage).toBe("en");
  });
});

describe("episodeSchema", () => {
  it("wraps the episode in TVEpisode + VideoObject", () => {
    const schema = episodeSchema(series, episode, {
      url: "https://ongx.test/series/attack/s/1/e/2",
      locale: "id",
    });

    expect(schema).toMatchObject({
      "@type": "TVEpisode",
      episodeNumber: 2,
      datePublished: "2024-01-02T00:00:00.000Z",
      partOfSeason: {
        "@type": "TVSeason",
        seasonNumber: 1,
        partOfSeries: { "@type": "TVSeries", url: "https://ongx.test/series/attack" },
      },
    });
    expect(schema.video).toMatchObject({
      "@type": "VideoObject",
      uploadDate: "2024-01-02T00:00:00.000Z",
      duration: "PT25M",
      thumbnailUrl: ["https://img.example/still.jpg"],
    });
  });
});

describe("breadcrumb, website and person schemas", () => {
  it("numbers breadcrumb items and omits the item URL for the trailing crumb", () => {
    const schema = breadcrumbSchema([
      { name: "Beranda", href: "/" },
      { name: "Film", href: "/film" },
      { name: "The Last Attack" },
    ]);

    expect(schema.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Beranda", item: "https://ongx.test/" },
      { "@type": "ListItem", position: 2, name: "Film", item: "https://ongx.test/film" },
      { "@type": "ListItem", position: 3, name: "The Last Attack" },
    ]);
  });

  it("advertises the search endpoint on the WebSite entity", () => {
    const schema = websiteSchema({
      siteUrl: "https://ongx.test/",
      searchUrl: "https://ongx.test/cari",
      locale: "id",
    });

    expect(schema).toMatchObject({
      "@type": "WebSite",
      url: "https://ongx.test/",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://ongx.test/cari?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    });
  });

  it("links a person to their works", () => {
    const schema = personSchema({
      slug: "person",
      name: "Actor",
      href: "/orang/person",
      works: [
        {
          id: "t1",
          slug: "attack",
          href: "/series/attack",
          watchHref: "/watch/t1",
          title: "Attack",
          kind: "SERIES",
          source: "TMDB",
          availableOnVidio: false,
          role: "CAST",
        },
      ],
    });

    expect(schema).toMatchObject({
      "@type": "Person",
      name: "Actor",
      url: "https://ongx.test/orang/person",
      performerIn: [
        { "@type": "TVSeries", name: "Attack", url: "https://ongx.test/series/attack" },
      ],
    });
  });
});
