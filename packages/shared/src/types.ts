export type Source = "TMDB" | "ANILIST" | "OWN";
export type Kind = "MOVIE" | "SERIES" | "EPISODE";
export type Status = "DRAFT" | "LIVE" | "BROKEN" | "GONE";
export type OfferType = "FLATRATE" | "FREE" | "ADS" | "RENT" | "BUY";
export type CreditRole = "CAST" | "CREW";

export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
  totalItems: number;
}

export interface NormalizedGenre {
  slug: string;
  nameId: string;
  nameEn: string;
  /** TMDB genre id, used to link rows to the seeded `Genre` table. */
  tmdbId?: number | undefined;
}

export interface NormalizedPerson {
  slug: string;
  name: string;
  imagePath?: string | undefined;
  /** TMDB person id; stable upsert key when present. */
  tmdbId?: number | undefined;
  /** Credits are stored with their role, label and display position. */
  role?: CreditRole | undefined;
  label?: string | undefined;
  position?: number | undefined;
}

export interface NormalizedOffer {
  region: string;
  providerId: string;
  providerName: string;
  offerType: OfferType;
  url: string;
  logoPath?: string | undefined;
}

export interface NormalizedTitle {
  source: Source;
  kind: Kind;
  remoteId: string;
  slug: string;
  titleId?: string | undefined;
  titleEn?: string | undefined;
  titleNative?: string | undefined;
  synopsis?: string | undefined;
  year?: number | undefined;
  /** ISO date string; converted to `Date` by the persistence layer. */
  releasedAt?: string | undefined;
  durationSec?: number | undefined;
  rating?: number | undefined;
  voteCount?: number | undefined;
  popularity?: number | undefined;
  /** Empty string when TMDB has no poster; the persistence layer skips those rows. */
  posterPath: string;
  backdropPath?: string | undefined;
  trailerKey?: string | undefined;
  ageRating?: string | undefined;
  country?: string | undefined;
  language?: string | undefined;
  genres: NormalizedGenre[];
  people: NormalizedPerson[];
  offers: NormalizedOffer[];
}
