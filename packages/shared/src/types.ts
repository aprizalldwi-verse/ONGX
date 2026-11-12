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
}

export interface NormalizedPerson {
  slug: string;
  name: string;
  imagePath?: string;
}

export interface NormalizedOffer {
  region: string;
  providerId: string;
  providerName: string;
  offerType: OfferType;
  url: string;
  logoPath?: string;
}

export interface NormalizedTitle {
  source: Source;
  kind: Kind;
  remoteId: string;
  slug: string;
  titleId?: string;
  titleEn?: string;
  titleNative?: string;
  synopsis?: string;
  year?: number;
  releasedAt?: string;
  durationSec?: number;
  rating?: number;
  voteCount?: number;
  popularity?: number;
  posterPath: string;
  backdropPath?: string;
  trailerKey?: string;
  ageRating?: string;
  country?: string;
  language?: string;
  genres: NormalizedGenre[];
  people: NormalizedPerson[];
  offers: NormalizedOffer[];
}
