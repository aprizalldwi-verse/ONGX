import { z } from "zod";

/**
 * Parsed subsets of the AniList GraphQL responses we consume. Zod strips every
 * field we do not model, so raw payloads never reach the domain layer.
 */

const nullableString = z.string().nullable().optional();
const nullableNumber = z.number().nullable().optional();

const anilistTitleSchema = z.object({
  romaji: nullableString,
  english: nullableString,
  native: nullableString,
});

const anilistCoverSchema = z.object({
  extraLarge: nullableString,
  large: nullableString,
  color: nullableString,
});

const anilistDateSchema = z.object({
  year: nullableNumber,
  month: nullableNumber,
  day: nullableNumber,
});

const anilistTrailerSchema = z
  .object({
    id: nullableString,
    site: nullableString,
  })
  .nullable()
  .optional();

export const anilistMediaSchema = z.object({
  id: z.number(),
  idMal: nullableNumber,
  title: anilistTitleSchema,
  description: nullableString,
  coverImage: anilistCoverSchema.optional(),
  bannerImage: nullableString,
  format: nullableString,
  status: nullableString,
  seasonYear: nullableNumber,
  startDate: anilistDateSchema.optional(),
  episodes: nullableNumber,
  duration: nullableNumber,
  averageScore: nullableNumber,
  popularity: nullableNumber,
  genres: z.array(z.string()).default([]),
  isAdult: z.boolean().optional(),
  countryOfOrigin: nullableString,
  trailer: anilistTrailerSchema,
});

const anilistStaffSchema = z.object({
  edges: z
    .array(
      z.object({
        role: nullableString,
        node: z.object({
          id: z.number(),
          name: z.object({ full: z.string() }),
          image: z.object({ large: nullableString }).optional(),
        }),
      }),
    )
    .default([]),
});

const anilistStreamingEpisodeSchema = z.object({
  title: nullableString,
  thumbnail: nullableString,
  url: nullableString,
  site: nullableString,
});

const anilistRecommendationSchema = z.object({
  mediaRecommendation: anilistMediaSchema.nullable().optional(),
});

/**
 * Official links per title. `type` is `STREAMING` for legal streaming
 * destinations, but AniList carries no regional availability or price model.
 */
const anilistExternalLinkSchema = z.object({
  id: nullableNumber,
  url: z.string(),
  site: z.string(),
  type: nullableString,
  language: nullableString,
  isDisabled: z.boolean().nullable().optional(),
});

export const anilistMediaDetailSchema = anilistMediaSchema.extend({
  recommendations: z.object({ nodes: z.array(anilistRecommendationSchema).default([]) }).optional(),
  streamingEpisodes: z.array(anilistStreamingEpisodeSchema).optional(),
  staff: anilistStaffSchema.optional(),
  externalLinks: z.array(anilistExternalLinkSchema).optional(),
});

const anilistPageInfoSchema = z.object({
  currentPage: z.number().default(1),
  lastPage: z.number().default(1),
  total: z.number().default(0),
  hasNextPage: z.boolean().default(false),
});

export const anilistMediaPageResponseSchema = z.object({
  data: z.object({
    Page: z.object({
      pageInfo: anilistPageInfoSchema,
      media: z.array(anilistMediaSchema).default([]),
    }),
  }),
});

export const anilistMediaDetailResponseSchema = z.object({
  data: z.object({ Media: anilistMediaDetailSchema.nullable() }),
});

export const anilistRelatedResponseSchema = z.object({
  data: z.object({
    Media: z
      .object({
        recommendations: z
          .object({ nodes: z.array(anilistRecommendationSchema).default([]) })
          .optional(),
      })
      .nullable(),
  }),
});

export const anilistEpisodesResponseSchema = z.object({
  data: z.object({
    Media: z
      .object({
        episodes: nullableNumber,
        duration: nullableNumber,
        streamingEpisodes: z.array(anilistStreamingEpisodeSchema).optional(),
      })
      .nullable(),
  }),
});

export const anilistGenresResponseSchema = z.object({
  data: z.object({ GenreCollection: z.array(z.string()).default([]) }),
});

export const anilistGraphqlErrorSchema = z.object({
  message: z.string(),
  status: z.number().optional(),
});

export type AniListMedia = z.infer<typeof anilistMediaSchema>;
export type AniListMediaDetail = z.infer<typeof anilistMediaDetailSchema>;
export type AniListStreamingEpisode = z.infer<typeof anilistStreamingEpisodeSchema>;
export type AniListExternalLink = z.infer<typeof anilistExternalLinkSchema>;
