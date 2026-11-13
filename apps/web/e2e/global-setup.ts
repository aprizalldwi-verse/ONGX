import { prisma } from "@ongx/db";

/**
 * Playwright fixture data. The public catalog has no `Source.OWN` rows yet, so
 * the player and provider-offer flows need a deterministic title that points at
 * the local HLS fixture in `public/test/fixtures/hls`. The row is removed again
 * by `global-teardown.ts`; it never belongs in a real catalog.
 */
export const E2E_TITLE_ID = "e2e-own-fixture";
export const E2E_PROVIDER_URL = "https://provider.example/e2e-fixture";

export default async function globalSetup(): Promise<void> {
  await prisma.title.upsert({
    where: { id: E2E_TITLE_ID },
    create: {
      id: E2E_TITLE_ID,
      slug: E2E_TITLE_ID,
      source: "OWN",
      kind: "MOVIE",
      remoteId: E2E_TITLE_ID,
      titleId: "E2E Player Fixture",
      titleEn: "E2E Player Fixture",
      synopsis: "Local HLS fixture used by the Playwright suite.",
      year: 2026,
      posterPath: "/e2e-poster.jpg",
      streamUrl: "/test/fixtures/hls/master.m3u8",
      status: "LIVE",
      popularity: 0,
      offers: {
        create: {
          region: "ID",
          providerId: "e2e-provider",
          providerName: "E2E Provider",
          offerType: "FLATRATE",
          url: E2E_PROVIDER_URL,
        },
      },
    },
    update: {
      streamUrl: "/test/fixtures/hls/master.m3u8",
      status: "LIVE",
    },
  });
}
