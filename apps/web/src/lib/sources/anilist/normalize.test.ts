import { describe, expect, it } from "vitest";

import {
  normalizeAniListDetail,
  normalizeAniListEpisodes,
  normalizeAniListMedia,
  normalizeAniListOffers,
  ratingFromScore,
  stripHtml,
} from "./normalize";
import { anilistMediaDetailSchema, anilistMediaSchema } from "./schemas";

const mediaPayload = {
  id: 16498,
  idMal: 16498,
  title: {
    romaji: "Shingeki no Kyojin",
    english: "Attack on Titan",
    native: "進撃の巨人",
  },
  description:
    "<p>Manusia hidup di balik tembok.<br><br>Hingga <i>titan</i> datang &amp; semuanya berubah &#039;selamanya&#039;.</p>",
  coverImage: {
    extraLarge: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498.jpg",
    large: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx16498.jpg",
    color: "#e4a15d",
  },
  bannerImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498.jpg",
  format: "TV",
  status: "FINISHED",
  seasonYear: 2013,
  startDate: { year: 2013, month: 4, day: 6 },
  episodes: 25,
  duration: 24,
  averageScore: 85,
  popularity: 450_000,
  genres: ["Action", "Drama", "Fantasy", "Sci-Fi"],
  isAdult: false,
  countryOfOrigin: "JP",
  trailer: { id: "LHtdKWJdif4", site: "youtube" },
};

describe("stripHtml", () => {
  it("converts breaks, removes tags and decodes entities", () => {
    expect(stripHtml("<p>Baris satu<br>Baris <b>dua</b> &amp; tiga &#039;ok&#039;</p>")).toBe(
      "Baris satu\nBaris dua & tiga 'ok'",
    );
  });

  it("returns undefined for empty input", () => {
    expect(stripHtml(undefined)).toBeUndefined();
    expect(stripHtml("   ")).toBeUndefined();
    expect(stripHtml("<br><br>")).toBeUndefined();
  });
});

describe("normalizeAniListMedia", () => {
  const media = anilistMediaSchema.parse(mediaPayload);
  const title = normalizeAniListMedia(media);

  it("maps identity, titles, slug and metadata", () => {
    expect(title.source).toBe("ANILIST");
    expect(title.kind).toBe("SERIES");
    expect(title.remoteId).toBe("16498");
    expect(title.titleId).toBe("Shingeki no Kyojin");
    expect(title.titleEn).toBe("Attack on Titan");
    expect(title.titleNative).toBe("進撃の巨人");
    expect(title.slug).toBe("shingeki-no-kyojin-2013");
    expect(title.year).toBe(2013);
    expect(title.releasedAt).toBe("2013-04-06");
    expect(title.durationSec).toBe(1440);
    expect(title.rating).toBe(8.5);
    expect(title.popularity).toBe(450_000);
    expect(title.country).toBe("JP");
    expect(title.trailerKey).toBe("LHtdKWJdif4");
  });

  it("keeps absolute image URLs and cleans the synopsis", () => {
    expect(title.posterPath).toBe(mediaPayload.coverImage.extraLarge);
    expect(title.backdropPath).toBe(mediaPayload.bannerImage);
    expect(title.synopsis).toBe(
      "Manusia hidup di balik tembok.\n\nHingga titan datang & semuanya berubah 'selamanya'.",
    );
  });

  it("maps genres to canonical slugs and always adds anime", () => {
    expect(title.genres.map((genre) => genre.slug)).toEqual([
      "action",
      "drama",
      "fantasy",
      "science-fiction",
      "anime",
    ]);
    expect(title.genres.find((genre) => genre.slug === "science-fiction")?.nameId).toBe(
      "Fiksi Ilmiah",
    );
  });

  it("treats anime movies as MOVIE", () => {
    const movie = anilistMediaSchema.parse({
      ...mediaPayload,
      id: 1,
      format: "MOVIE",
      startDate: { year: 2016 },
      episodes: 1,
      averageScore: 0,
    });
    const normalized = normalizeAniListMedia(movie);
    expect(normalized.kind).toBe("MOVIE");
    expect(normalized.rating).toBeUndefined();
    expect(normalized.releasedAt).toBe("2016-01-01");
  });
});

describe("normalizeAniListDetail", () => {
  it("adds one season, the episode count and staff credits", () => {
    const detail = anilistMediaDetailSchema.parse({
      ...mediaPayload,
      recommendations: { nodes: [{ mediaRecommendation: mediaPayload }] },
      streamingEpisodes: [
        { title: "Episode 1 - To You, 2000 Years Later", thumbnail: "https://x/1.jpg" },
      ],
      staff: {
        edges: [
          {
            role: "Director",
            node: { id: 1, name: { full: "Tetsuro Araki" }, image: { large: "https://x/s.jpg" } },
          },
        ],
      },
    });

    const title = normalizeAniListDetail(detail);

    expect(title.seasons).toEqual([{ number: 1, name: "Season 1", episodeCount: 25 }]);
    expect(title.episodesCount).toBe(25);
    expect(title.people).toHaveLength(1);
    expect(title.people[0]?.role).toBe("CREW");
    expect(title.people[0]?.label).toBe("Director");
    expect(title.people[0]?.slug).toBe("tetsuro-araki");
  });

  it("maps official streaming links to offers", () => {
    const detail = anilistMediaDetailSchema.parse({
      ...mediaPayload,
      externalLinks: [
        {
          id: 8,
          url: "http://www.crunchyroll.com/attack-on-titan",
          site: "Crunchyroll",
          type: "STREAMING",
          language: null,
          isDisabled: false,
        },
        { id: 45, url: "http://shingeki.tv/", site: "Official Site", type: "INFO" },
      ],
    });

    expect(normalizeAniListDetail(detail).offers).toEqual([
      {
        region: "WW",
        providerId: "crunchyroll",
        providerName: "Crunchyroll",
        offerType: "FLATRATE",
        url: "http://www.crunchyroll.com/attack-on-titan",
      },
    ]);
  });
});

describe("normalizeAniListOffers", () => {
  it("keeps streaming links, marks YouTube free and skips the rest", () => {
    const offers = normalizeAniListOffers([
      {
        id: 8,
        url: "http://www.crunchyroll.com/attack-on-titan",
        site: "Crunchyroll",
        type: "STREAMING",
        language: null,
        isDisabled: false,
      },
      {
        id: 168773,
        url: "https://youtube.com/@attackontitan_officialchannel",
        site: "YouTube",
        type: "STREAMING",
        language: null,
        isDisabled: false,
      },
      { id: 45, url: "http://shingeki.tv/", site: "Official Site", type: "INFO" },
      {
        id: 4,
        url: "https://www.hulu.com/attack-on-titan",
        site: "Hulu",
        type: "STREAMING",
        language: null,
        isDisabled: true,
      },
      { id: 5, url: "not a url", site: "Broken", type: "STREAMING" },
    ]);

    expect(offers).toEqual([
      {
        region: "WW",
        providerId: "crunchyroll",
        providerName: "Crunchyroll",
        offerType: "FLATRATE",
        url: "http://www.crunchyroll.com/attack-on-titan",
      },
      {
        region: "WW",
        providerId: "youtube",
        providerName: "YouTube",
        offerType: "FREE",
        url: "https://youtube.com/@attackontitan_officialchannel",
      },
    ]);
  });

  it("deduplicates the same provider and offer type", () => {
    const offers = normalizeAniListOffers([
      { url: "https://www.crunchyroll.com/a", site: "Crunchyroll", type: "STREAMING" },
      { url: "https://www.crunchyroll.com/b", site: "Crunchyroll", type: "STREAMING" },
    ]);

    expect(offers).toHaveLength(1);
    expect(offers[0]?.url).toBe("https://www.crunchyroll.com/a");
  });

  it("returns an empty list when AniList has no links", () => {
    expect(normalizeAniListOffers(undefined)).toEqual([]);
  });
});

describe("normalizeAniListEpisodes", () => {
  it("maps streaming episodes with a 1-based number", () => {
    const episodes = normalizeAniListEpisodes({
      episodes: 3,
      duration: 24,
      streamingEpisodes: [
        { title: "Episode 1", thumbnail: "https://x/1.jpg" },
        { title: null, thumbnail: null },
      ],
    });

    expect(episodes).toHaveLength(2);
    expect(episodes[0]).toMatchObject({
      season: 1,
      number: 1,
      name: "Episode 1",
      durationSec: 1440,
    });
    expect(episodes[1]).toMatchObject({ number: 2, name: "Episode 2" });
    expect(episodes[1]?.stillPath).toBeUndefined();
  });

  it("synthesises an episode list when AniList has no streaming data", () => {
    const episodes = normalizeAniListEpisodes({ episodes: 2, duration: 12 });
    expect(episodes.map((episode) => episode.name)).toEqual(["Episode 1", "Episode 2"]);
  });

  it("only supports season 1", () => {
    expect(normalizeAniListEpisodes({ episodes: 2 }, 2)).toEqual([]);
  });
});

describe("ratingFromScore", () => {
  it("converts the 0–100 score to one decimal place", () => {
    expect(ratingFromScore(85)).toBe(8.5);
    expect(ratingFromScore(73)).toBe(7.3);
    expect(ratingFromScore(0)).toBeUndefined();
    expect(ratingFromScore(null)).toBeUndefined();
  });
});
