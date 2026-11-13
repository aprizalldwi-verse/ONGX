import { describe, expect, it } from "vitest";

import { isVidioOffer, providerUrl, vidioSearchUrl } from "./providers";

describe("isVidioOffer", () => {
  it("matches by provider name regardless of case or padding", () => {
    expect(isVidioOffer({ providerId: "489", providerName: "Vidio" })).toBe(true);
    expect(isVidioOffer({ providerId: "unknown", providerName: "  vidio " })).toBe(true);
  });

  it("matches the TMDB id and the AniList slug", () => {
    expect(isVidioOffer({ providerId: "489", providerName: "Renamed" })).toBe(true);
    expect(isVidioOffer({ providerId: "Vidio", providerName: "Renamed" })).toBe(true);
  });

  it("rejects every other provider", () => {
    expect(isVidioOffer({ providerId: "8", providerName: "Netflix" })).toBe(false);
    expect(isVidioOffer({ providerId: "283", providerName: "Crunchyroll" })).toBe(false);
  });
});

describe("vidioSearchUrl", () => {
  it("encodes the title into an official search deep link", () => {
    expect(vidioSearchUrl("One Piece")).toBe("https://www.vidio.com/search?q=One%20Piece");
    expect(vidioSearchUrl("  Laskar Pelangi  ")).toBe(
      "https://www.vidio.com/search?q=Laskar%20Pelangi",
    );
    expect(vidioSearchUrl("A & B")).toBe("https://www.vidio.com/search?q=A%20%26%20B");
  });
});

describe("providerUrl", () => {
  const vidio = {
    providerId: "489",
    providerName: "Vidio",
    url: "https://www.themoviedb.org/tv/37854/watch?locale=ID",
  };

  it("rewrites Vidio offers to the search deep link", () => {
    expect(providerUrl(vidio, "One Piece")).toBe(vidioSearchUrl("One Piece"));
  });

  it("keeps other provider URLs untouched", () => {
    const netflix = {
      providerId: "8",
      providerName: "Netflix",
      url: "https://www.netflix.com/title/80107103",
    };

    expect(providerUrl(netflix, "One Piece")).toBe(netflix.url);
  });

  it("falls back to the stored URL when there is no usable title", () => {
    expect(providerUrl(vidio, "   ")).toBe(vidio.url);
  });
});
