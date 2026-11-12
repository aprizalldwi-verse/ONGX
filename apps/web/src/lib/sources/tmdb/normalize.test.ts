import { describe, expect, it } from "vitest";

import { tmdbImage } from "./images";
import {
  normalizeMovieDetail,
  normalizeMovieListItem,
  normalizeOffers,
  normalizeSearchItem,
  normalizeTvDetail,
  pickTrailerKey,
} from "./normalize";
import {
  tmdbMovieDetailSchema,
  tmdbMovieListItemSchema,
  tmdbSearchItemSchema,
  tmdbTvDetailSchema,
  tmdbWatchProvidersSchema,
} from "./schemas";

const movieDetail = tmdbMovieDetailSchema.parse({
  id: 101,
  title: "Petualangan Sherina",
  original_title: "Sherina's Adventure",
  overview: "  Sebuah petualangan musikal.  ",
  release_date: "2000-06-14",
  poster_path: "/poster.jpg",
  backdrop_path: null,
  vote_average: 7.6,
  vote_count: 120,
  popularity: 12.5,
  genre_ids: [12, 35],
  original_language: "id",
  runtime: 112,
  genres: [
    { id: 12, name: "Adventure" },
    { id: 35, name: "Comedy" },
  ],
  credits: {
    cast: [
      { id: 1, name: "Sherina Munaf", profile_path: "/s.jpg", character: "Sherina", order: 1 },
      { id: 2, name: "Desta Mahendra", profile_path: null, character: "Desta", order: 0 },
    ],
    crew: [
      { id: 3, name: "Riri Riza", profile_path: null, job: "Director" },
      { id: 4, name: "Mira Lesmana", profile_path: null, job: "Producer" },
    ],
  },
  videos: {
    results: [
      { key: "teaser", site: "YouTube", type: "Teaser", official: true },
      { key: "amateur", site: "YouTube", type: "Trailer", official: false },
      { key: "official", site: "YouTube", type: "Trailer", official: true },
    ],
  },
  release_dates: {
    results: [
      { iso_3166_1: "US", release_dates: [{ certification: "PG" }] },
      { iso_3166_1: "ID", release_dates: [{ certification: "13+" }] },
    ],
  },
  alternative_titles: {
    titles: [
      { iso_3166_1: "ID", title: "Petualangan Sherina" },
      { iso_3166_1: "US", title: "Sherina's Adventure" },
    ],
  },
  production_countries: [{ iso_3166_1: "ID", name: "Indonesia" }],
});

describe("normalizeMovieDetail", () => {
  const title = normalizeMovieDetail(movieDetail, "ID");

  it("maps identity, localisation and slug", () => {
    expect(title.source).toBe("TMDB");
    expect(title.kind).toBe("MOVIE");
    expect(title.remoteId).toBe("101");
    expect(title.titleId).toBe("Petualangan Sherina");
    expect(title.titleEn).toBe("Sherina's Adventure");
    expect(title.slug).toBe("petualangan-sherina-2000");
    expect(title.synopsis).toBe("Sebuah petualangan musikal.");
    expect(title.year).toBe(2000);
    expect(title.releasedAt).toBe("2000-06-14");
  });

  it("maps technical metadata", () => {
    expect(title.durationSec).toBe(112);
    expect(title.ageRating).toBe("13+");
    expect(title.country).toBe("ID");
    expect(title.language).toBe("id");
    expect(title.trailerKey).toBe("official");
    expect(title.posterPath).toBe("/poster.jpg");
    expect(title.backdropPath).toBeUndefined();
  });

  it("uses the canonical Indonesian genre names", () => {
    expect(title.genres.map((genre) => genre.slug)).toEqual(["adventure", "comedy"]);
    expect(title.genres.map((genre) => genre.nameId)).toEqual(["Petualangan", "Komedi"]);
  });

  it("orders cast by TMDB order and keeps only recognised crew jobs", () => {
    const cast = title.people.filter((person) => person.role === "CAST");
    const crew = title.people.filter((person) => person.role === "CREW");

    expect(cast.map((person) => person.name)).toEqual(["Desta Mahendra", "Sherina Munaf"]);
    expect(cast.map((person) => person.position)).toEqual([0, 1]);
    expect(cast[0]?.label).toBe("Desta");
    expect(cast[0]?.tmdbId).toBe(2);
    expect(cast[0]?.imagePath).toBeUndefined();

    expect(crew).toHaveLength(1);
    expect(crew[0]?.name).toBe("Riri Riza");
    expect(crew[0]?.label).toBe("Director");
    expect(crew[0]?.slug).toBe("riri-riza");
  });
});

describe("normalizeTvDetail", () => {
  const detail = tmdbTvDetailSchema.parse({
    id: 202,
    name: "Rahasia Keluarga",
    original_name: "Family Secret",
    overview: "",
    first_air_date: "2024-01-05",
    poster_path: "/tv.jpg",
    vote_average: 0,
    vote_count: 0,
    popularity: 3,
    original_language: "id",
    episode_run_time: [45, 50],
    genres: [{ id: 18, name: "Drama" }],
    content_ratings: {
      results: [
        { iso_3166_1: "US", rating: "TV-14" },
        { iso_3166_1: "ID", rating: "13+" },
      ],
    },
    origin_country: ["ID"],
    videos: { results: [] },
    alternative_titles: { titles: [] },
    credits: { cast: [], crew: [] },
  });

  const title = normalizeTvDetail(detail, "ID");

  it("maps series identity and runtime", () => {
    expect(title.kind).toBe("SERIES");
    expect(title.slug).toBe("rahasia-keluarga-2024");
    expect(title.durationSec).toBe(45);
    expect(title.country).toBe("ID");
    expect(title.ageRating).toBe("13+");
  });

  it("drops zero ratings and empty synopsis", () => {
    expect(title.rating).toBeUndefined();
    expect(title.voteCount).toBe(0);
    expect(title.synopsis).toBeUndefined();
  });
});

describe("normalizeMovieListItem", () => {
  const item = tmdbMovieListItemSchema.parse({
    id: 9,
    title: "Tanpa Poster",
    overview: "",
    release_date: "2021-03-01",
    poster_path: null,
    vote_average: 0,
    popularity: 1,
    genre_ids: [999_999, 28],
  });

  const title = normalizeMovieListItem(item);

  it("keeps a placeholder poster path and drops unknown genres", () => {
    expect(title.posterPath).toBe("");
    expect(title.genres.map((genre) => genre.slug)).toEqual(["action"]);
  });

  it("only sets year and rating when present", () => {
    expect(title.year).toBe(2021);
    expect(title.rating).toBeUndefined();
    expect(title.slug).toBe("tanpa-poster-2021");
  });
});

describe("normalizeSearchItem", () => {
  it("drops people", () => {
    const person = tmdbSearchItemSchema.parse({ id: 5, media_type: "person", name: "Someone" });
    expect(normalizeSearchItem(person)).toBeUndefined();
  });

  it("detects TV results", () => {
    const tv = tmdbSearchItemSchema.parse({
      id: 6,
      media_type: "tv",
      name: "Show",
      first_air_date: "2020-01-01",
      poster_path: "/s.jpg",
    });
    const title = normalizeSearchItem(tv);
    expect(title?.kind).toBe("SERIES");
    expect(title?.slug).toBe("show-2020");
  });

  it("falls back to movies when media_type is missing", () => {
    const movie = tmdbSearchItemSchema.parse({
      id: 7,
      title: "Film",
      release_date: "2019-05-01",
      poster_path: "/f.jpg",
    });
    expect(normalizeSearchItem(movie)?.kind).toBe("MOVIE");
  });
});

describe("normalizeOffers", () => {
  const payload = tmdbWatchProvidersSchema.parse({
    results: {
      ID: {
        link: "https://www.themoviedb.org/movie/101/watch?locale=ID",
        flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: "/netflix.jpg" }],
        rent: [{ provider_id: 8, provider_name: "Netflix", logo_path: "/netflix.jpg" }],
        ads: [{ provider_id: 3, provider_name: "Disney+", logo_path: null }],
      },
    },
  });

  it("maps every bucket to an offer type and reuses the regional link", () => {
    const offers = normalizeOffers(payload, "id");
    expect(offers.map((offer) => offer.offerType)).toEqual(["FLATRATE", "ADS", "RENT"]);
    expect(offers[0]?.region).toBe("ID");
    expect(offers[0]?.url).toBe(payload.results.ID?.link);
    expect(offers[1]?.logoPath).toBeUndefined();
  });

  it("returns an empty list without a regional entry or link", () => {
    expect(normalizeOffers(payload, "US")).toEqual([]);
    expect(normalizeOffers(tmdbWatchProvidersSchema.parse({ results: { ID: {} } }), "ID")).toEqual(
      [],
    );
  });
});

describe("pickTrailerKey", () => {
  it("prefers official YouTube trailers", () => {
    expect(
      pickTrailerKey([
        { key: "a", site: "YouTube", type: "Trailer" },
        { key: "b", site: "YouTube", type: "Trailer", official: true },
      ]),
    ).toBe("b");
  });

  it("returns undefined when there is no usable trailer", () => {
    expect(pickTrailerKey(undefined)).toBeUndefined();
    expect(pickTrailerKey([{ key: "x", site: "Vimeo", type: "Trailer" }])).toBeUndefined();
    expect(pickTrailerKey([{ key: "x", site: "YouTube", type: "Teaser" }])).toBeUndefined();
  });
});

describe("tmdbImage", () => {
  it("builds absolute URLs and tolerates missing slashes", () => {
    expect(tmdbImage("/poster.jpg", "w342")).toBe("https://image.tmdb.org/t/p/w342/poster.jpg");
    expect(tmdbImage("poster.jpg")).toBe("https://image.tmdb.org/t/p/w500/poster.jpg");
  });

  it("returns undefined for empty paths", () => {
    expect(tmdbImage("")).toBeUndefined();
    expect(tmdbImage(null)).toBeUndefined();
    expect(tmdbImage(undefined)).toBeUndefined();
  });
});
