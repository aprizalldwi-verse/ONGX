/**
 * Provider helpers shared by the read model, the listing filters and the
 * poster badge.
 *
 * Vidio exposes no public playback API, so TMDB's aggregate watch link (one URL
 * for every provider) is useless for it. Vidio offers are rewritten to an
 * official search deep link instead.
 */

export const VIDIO_PROVIDER_NAME = "Vidio";

/** TMDB provider id for Vidio in the ID region; AniList links use a slug. */
const VIDIO_PROVIDER_IDS = new Set(["489", "vidio"]);

export interface ProviderOffer {
  providerId: string;
  providerName: string;
  url: string;
}

export function isVidioOffer(offer: Pick<ProviderOffer, "providerId" | "providerName">): boolean {
  const name = offer.providerName.trim().toLowerCase();
  if (name === VIDIO_PROVIDER_NAME.toLowerCase()) return true;
  return VIDIO_PROVIDER_IDS.has(offer.providerId.trim().toLowerCase());
}

export function vidioSearchUrl(title: string): string {
  return `https://www.vidio.com/search?q=${encodeURIComponent(title.trim())}`;
}

/**
 * Keeps real provider URLs untouched and resolves Vidio through its own search.
 * Without a usable title there is nothing to search for, so the original link
 * (and its provider note) is kept.
 */
export function providerUrl(offer: ProviderOffer, title: string): string {
  if (!isVidioOffer(offer)) return offer.url;
  const query = title.trim();
  return query.length > 0 ? vidioSearchUrl(query) : offer.url;
}
