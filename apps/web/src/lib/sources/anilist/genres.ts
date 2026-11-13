import { slugify, type NormalizedGenre } from "@ongx/shared";

interface GenreDefinition {
  slug: string;
  nameId: string;
  nameEn: string;
}

/**
 * AniList genre labels mapped to our canonical genre slugs. Genres that TMDB
 * does not expose (Mecha, Slice of Life, ...) are created on first upsert.
 */
const ANILIST_GENRES: Record<string, GenreDefinition> = {
  Action: { slug: "action", nameId: "Aksi", nameEn: "Action" },
  Adventure: { slug: "adventure", nameId: "Petualangan", nameEn: "Adventure" },
  Comedy: { slug: "comedy", nameId: "Komedi", nameEn: "Comedy" },
  Drama: { slug: "drama", nameId: "Drama", nameEn: "Drama" },
  Ecchi: { slug: "ecchi", nameId: "Ecchi", nameEn: "Ecchi" },
  Fantasy: { slug: "fantasy", nameId: "Fantasi", nameEn: "Fantasy" },
  Horror: { slug: "horror", nameId: "Horor", nameEn: "Horror" },
  "Mahou Shoujo": { slug: "mahou-shoujo", nameId: "Mahou Shoujo", nameEn: "Mahou Shoujo" },
  Mecha: { slug: "mecha", nameId: "Mecha", nameEn: "Mecha" },
  Music: { slug: "music", nameId: "Musik", nameEn: "Music" },
  Mystery: { slug: "mystery", nameId: "Misteri", nameEn: "Mystery" },
  Psychological: { slug: "psychological", nameId: "Psikologis", nameEn: "Psychological" },
  Romance: { slug: "romance", nameId: "Romansa", nameEn: "Romance" },
  "Sci-Fi": { slug: "science-fiction", nameId: "Fiksi Ilmiah", nameEn: "Science Fiction" },
  "Slice of Life": {
    slug: "slice-of-life",
    nameId: "Kehidupan Sehari-hari",
    nameEn: "Slice of Life",
  },
  Sports: { slug: "sports", nameId: "Olahraga", nameEn: "Sports" },
  Supernatural: { slug: "supernatural", nameId: "Supranatural", nameEn: "Supernatural" },
  Thriller: { slug: "thriller", nameId: "Thriller", nameEn: "Thriller" },
};

/** Every anime also gets this cross-source genre, used by `/genre/anime`. */
const ANIME_GENRE: NormalizedGenre = {
  slug: "anime",
  nameId: "Anime",
  nameEn: "Anime",
};

const bySlug = new Map<string, string>(
  Object.entries(ANILIST_GENRES).map(([name, definition]) => [definition.slug, name]),
);

export function genreFromAniListName(name: string): NormalizedGenre {
  const definition = ANILIST_GENRES[name];
  if (definition) return { ...definition };

  return {
    slug: slugify(name),
    nameId: name,
    nameEn: name,
  };
}

/** Canonical AniList genre name for one of our slugs, when we track it. */
export function anilistGenreName(slug: string): string | undefined {
  return bySlug.get(slug);
}

/** Maps AniList genres and always appends the `anime` marker genre. */
export function genresFromAniList(names: string[]): NormalizedGenre[] {
  const seen = new Set<string>();
  const result: NormalizedGenre[] = [];

  for (const name of names) {
    const genre = genreFromAniListName(name);
    if (seen.has(genre.slug)) continue;
    seen.add(genre.slug);
    result.push(genre);
  }

  if (!seen.has(ANIME_GENRE.slug)) result.push({ ...ANIME_GENRE });

  return result;
}

/** All genres AniList can return, in the canonical order (used by tests/docs). */
export function anilistGenreCatalog(): NormalizedGenre[] {
  return Object.values(ANILIST_GENRES).map((definition) => ({ ...definition }));
}
