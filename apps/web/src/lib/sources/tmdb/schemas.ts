import { z } from "zod";

/**
 * Parsed subsets of the TMDB v3 responses we consume. Zod strips every field
 * we do not model, so raw payloads never leak into the domain layer.
 */

const nullableString = z.string().nullable().optional();
const nullableNumber = z.number().nullable().optional();

const tmdbGenreSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const tmdbGenreListSchema = z.object({
  genres: z.array(tmdbGenreSchema).default([]),
});

export const tmdbMovieListItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string().optional(),
  overview: z.string().optional(),
  release_date: z.string().optional(),
  poster_path: nullableString,
  backdrop_path: nullableString,
  vote_average: nullableNumber,
  vote_count: nullableNumber,
  popularity: nullableNumber,
  genre_ids: z.array(z.number()).optional(),
  original_language: z.string().optional(),
});

const tmdbTvListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  original_name: z.string().optional(),
  overview: z.string().optional(),
  first_air_date: z.string().optional(),
  poster_path: nullableString,
  backdrop_path: nullableString,
  vote_average: nullableNumber,
  vote_count: nullableNumber,
  popularity: nullableNumber,
  genre_ids: z.array(z.number()).optional(),
  original_language: z.string().optional(),
});

export const tmdbMoviePageSchema = z.object({
  page: z.number().default(1),
  results: z.array(tmdbMovieListItemSchema).default([]),
  total_pages: z.number().default(1),
  total_results: z.number().default(0),
});

export const tmdbTvPageSchema = z.object({
  page: z.number().default(1),
  results: z.array(tmdbTvListItemSchema).default([]),
  total_pages: z.number().default(1),
  total_results: z.number().default(0),
});

export const tmdbSearchItemSchema = z.object({
  id: z.number(),
  media_type: z.enum(["movie", "tv", "person"]).optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  original_title: z.string().optional(),
  original_name: z.string().optional(),
  overview: z.string().optional(),
  release_date: z.string().optional(),
  first_air_date: z.string().optional(),
  poster_path: nullableString,
  backdrop_path: nullableString,
  vote_average: nullableNumber,
  vote_count: nullableNumber,
  popularity: nullableNumber,
  genre_ids: z.array(z.number()).optional(),
  original_language: z.string().optional(),
});

export const tmdbSearchPageSchema = z.object({
  page: z.number().default(1),
  results: z.array(tmdbSearchItemSchema).default([]),
  total_pages: z.number().default(1),
  total_results: z.number().default(0),
});

const tmdbCreditPersonSchema = z.object({
  id: z.number(),
  name: z.string(),
  profile_path: nullableString,
});

const tmdbCreditsSchema = z.object({
  cast: z
    .array(
      tmdbCreditPersonSchema.extend({
        character: z.string().optional(),
        order: z.number().optional(),
      }),
    )
    .default([]),
  crew: z
    .array(
      tmdbCreditPersonSchema.extend({
        job: z.string().optional(),
        department: z.string().optional(),
      }),
    )
    .default([]),
});

const tmdbVideosSchema = z.object({
  results: z
    .array(
      z.object({
        key: z.string(),
        site: z.string(),
        type: z.string(),
        official: z.boolean().optional(),
      }),
    )
    .default([]),
});

const tmdbReleaseDatesSchema = z.object({
  results: z
    .array(
      z.object({
        iso_3166_1: z.string(),
        release_dates: z.array(z.object({ certification: z.string().optional() })).default([]),
      }),
    )
    .default([]),
});

const tmdbContentRatingsSchema = z.object({
  results: z.array(z.object({ iso_3166_1: z.string(), rating: z.string().optional() })).default([]),
});

const tmdbAlternativeTitlesSchema = z.object({
  titles: z.array(z.object({ iso_3166_1: z.string(), title: z.string() })).default([]),
});

const tmdbProductionCountrySchema = z.object({
  iso_3166_1: z.string(),
  name: z.string().optional(),
});

export const tmdbMovieDetailSchema = tmdbMovieListItemSchema.extend({
  runtime: nullableNumber,
  genres: z.array(tmdbGenreSchema).optional(),
  credits: tmdbCreditsSchema.optional(),
  videos: tmdbVideosSchema.optional(),
  release_dates: tmdbReleaseDatesSchema.optional(),
  alternative_titles: tmdbAlternativeTitlesSchema.optional(),
  production_countries: z.array(tmdbProductionCountrySchema).optional(),
});

export const tmdbTvDetailSchema = tmdbTvListItemSchema.extend({
  episode_run_time: z.array(z.number()).optional(),
  number_of_seasons: nullableNumber,
  number_of_episodes: nullableNumber,
  seasons: z
    .array(
      z.object({
        season_number: z.number(),
        name: z.string(),
        episode_count: z.number().default(0),
        air_date: nullableString,
      }),
    )
    .optional(),
  genres: z.array(tmdbGenreSchema).optional(),
  credits: tmdbCreditsSchema.optional(),
  videos: tmdbVideosSchema.optional(),
  content_ratings: tmdbContentRatingsSchema.optional(),
  alternative_titles: tmdbAlternativeTitlesSchema.optional(),
  origin_country: z.array(z.string()).optional(),
});

const tmdbSeasonEpisodeSchema = z.object({
  episode_number: z.number(),
  name: z.string().optional(),
  overview: z.string().optional(),
  air_date: nullableString,
  runtime: nullableNumber,
  still_path: nullableString,
});

export const tmdbSeasonDetailSchema = z.object({
  season_number: z.number().default(1),
  episodes: z.array(tmdbSeasonEpisodeSchema).default([]),
});

const tmdbProviderSchema = z.object({
  provider_id: z.number(),
  provider_name: z.string(),
  logo_path: nullableString,
});

const tmdbRegionProvidersSchema = z.object({
  link: z.string().optional(),
  flatrate: z.array(tmdbProviderSchema).optional(),
  free: z.array(tmdbProviderSchema).optional(),
  ads: z.array(tmdbProviderSchema).optional(),
  rent: z.array(tmdbProviderSchema).optional(),
  buy: z.array(tmdbProviderSchema).optional(),
});

export const tmdbWatchProvidersSchema = z.object({
  results: z.record(z.string(), tmdbRegionProvidersSchema).default({}),
});

export type TmdbMovieListItem = z.infer<typeof tmdbMovieListItemSchema>;
export type TmdbTvListItem = z.infer<typeof tmdbTvListItemSchema>;
export type TmdbSearchItem = z.infer<typeof tmdbSearchItemSchema>;
export type TmdbMovieDetail = z.infer<typeof tmdbMovieDetailSchema>;
export type TmdbTvDetail = z.infer<typeof tmdbTvDetailSchema>;
export type TmdbSeasonDetail = z.infer<typeof tmdbSeasonDetailSchema>;
export type TmdbWatchProviders = z.infer<typeof tmdbWatchProvidersSchema>;
export type TmdbRegionProviders = z.infer<typeof tmdbRegionProvidersSchema>;
export type TmdbProvider = z.infer<typeof tmdbProviderSchema>;
