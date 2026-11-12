export interface GenreSeed {
  slug: string;
  nameId: string;
  nameEn: string;
  tmdbId: number;
}

/**
 * Fixed genre set (TMDB ids). 19 movie genres + 5 TV-only genres = 24.
 * Seeded idempotently so `/genre/[slug]` is stable across environments.
 */
export const GENRES: readonly GenreSeed[] = [
  { slug: "action", nameId: "Aksi", nameEn: "Action", tmdbId: 28 },
  { slug: "adventure", nameId: "Petualangan", nameEn: "Adventure", tmdbId: 12 },
  { slug: "animation", nameId: "Animasi", nameEn: "Animation", tmdbId: 16 },
  { slug: "comedy", nameId: "Komedi", nameEn: "Comedy", tmdbId: 35 },
  { slug: "crime", nameId: "Kejahatan", nameEn: "Crime", tmdbId: 80 },
  { slug: "documentary", nameId: "Dokumenter", nameEn: "Documentary", tmdbId: 99 },
  { slug: "drama", nameId: "Drama", nameEn: "Drama", tmdbId: 18 },
  { slug: "family", nameId: "Keluarga", nameEn: "Family", tmdbId: 10751 },
  { slug: "fantasy", nameId: "Fantasi", nameEn: "Fantasy", tmdbId: 14 },
  { slug: "history", nameId: "Sejarah", nameEn: "History", tmdbId: 36 },
  { slug: "horror", nameId: "Horor", nameEn: "Horror", tmdbId: 27 },
  { slug: "music", nameId: "Musik", nameEn: "Music", tmdbId: 10402 },
  { slug: "mystery", nameId: "Misteri", nameEn: "Mystery", tmdbId: 9648 },
  { slug: "romance", nameId: "Romansa", nameEn: "Romance", tmdbId: 10749 },
  { slug: "science-fiction", nameId: "Fiksi Ilmiah", nameEn: "Science Fiction", tmdbId: 878 },
  { slug: "tv-movie", nameId: "Film TV", nameEn: "TV Movie", tmdbId: 10770 },
  { slug: "thriller", nameId: "Thriller", nameEn: "Thriller", tmdbId: 53 },
  { slug: "war", nameId: "Perang", nameEn: "War", tmdbId: 10752 },
  { slug: "western", nameId: "Barat", nameEn: "Western", tmdbId: 37 },
  {
    slug: "action-adventure",
    nameId: "Aksi & Petualangan",
    nameEn: "Action & Adventure",
    tmdbId: 10759,
  },
  { slug: "kids", nameId: "Anak", nameEn: "Kids", tmdbId: 10762 },
  { slug: "news", nameId: "Berita", nameEn: "News", tmdbId: 10763 },
  { slug: "reality", nameId: "Realitas", nameEn: "Reality", tmdbId: 10764 },
  {
    slug: "sci-fi-fantasy",
    nameId: "Fiksi Ilmiah & Fantasi",
    nameEn: "Sci-Fi & Fantasy",
    tmdbId: 10765,
  },
];

export function genreSlugs(): string[] {
  return GENRES.map((genre) => genre.slug);
}
