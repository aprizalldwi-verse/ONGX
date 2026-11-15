import { prisma } from "@ongx/db";
import type { NormalizedOffer } from "@ongx/shared";

import { TmdbAdapter } from "@/lib/sources/tmdb/adapter";

import { localLimiter } from "./limiter";
import { consoleLogger, type SyncLogger } from "./logger";

/**
 * Provider offers change far more often than metadata. This job refreshes the
 * `WatchOffer` rows of the freshest catalogue titles on a short cadence while
 * `runCatalogSync` keeps handling titles, genres, credits and episodes.
 */

export interface OfferRefreshOptions {
  /** Maximum titles refreshed in this run. */
  limit: number;
  /** Titles whose offers are newer than this are skipped. */
  maxAgeHours: number;
  /** ISO-3166-1 region. Defaults to `ID`. */
  region?: string | undefined;
  logger?: SyncLogger | undefined;
  meta?: Record<string, unknown> | undefined;
  now?: Date | undefined;
}

export interface OfferRefreshResult {
  candidates: number;
  refreshed: number;
  failed: number;
  offers: number;
}

function offerRows(titleId: string, offers: readonly NormalizedOffer[]) {
  return offers.map((offer) => ({
    titleId,
    region: offer.region,
    providerId: offer.providerId,
    providerName: offer.providerName,
    offerType: offer.offerType,
    url: offer.url,
    logoPath: offer.logoPath ?? null,
  }));
}

export async function refreshTmdbOffers(options: OfferRefreshOptions): Promise<OfferRefreshResult> {
  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is missing. Add it to apps/web/.env.local first.");
  }

  const logger = options.logger ?? consoleLogger;
  const region = (options.region ?? process.env.TMDB_REGION ?? "ID").toUpperCase();
  const now = options.now ?? new Date();
  const cutoff = new Date(now.getTime() - options.maxAgeHours * 60 * 60 * 1_000);

  const rows = await prisma.title.findMany({
    where: {
      source: "TMDB",
      status: "LIVE",
      OR: [{ offersUpdatedAt: null }, { offersUpdatedAt: { lt: cutoff } }],
    },
    // Popular titles deserve the freshest links; `id` keeps paging stable when
    // popularity ties.
    orderBy: [{ popularity: "desc" }, { id: "asc" }],
    take: Math.max(1, options.limit),
    select: { id: true, kind: true, remoteId: true, slug: true },
  });

  const result: OfferRefreshResult = {
    candidates: rows.length,
    refreshed: 0,
    failed: 0,
    offers: 0,
  };

  const job = await prisma.syncJob.create({
    data: {
      source: "TMDB",
      status: "RUNNING",
      meta: { job: "sync.offers", candidates: rows.length, region, ...options.meta },
    },
  });

  const adapter = new TmdbAdapter({ apiKey, region, limiter: localLimiter(40, 10_000) });

  try {
    for (const row of rows) {
      const remoteId = `${row.kind === "MOVIE" ? "movie" : "tv"}:${row.remoteId}`;

      try {
        const offers: NormalizedOffer[] = await adapter.offers(remoteId, region);

        await prisma.$transaction(
          async (tx) => {
            // Replace only after the fetch succeeded: a failed upstream call must
            // never wipe links that already work.
            await tx.watchOffer.deleteMany({ where: { titleId: row.id } });
            const data = offerRows(row.id, offers);
            if (data.length > 0) {
              await tx.watchOffer.createMany({ data, skipDuplicates: true });
            }
            await tx.title.update({
              where: { id: row.id },
              data: { offersUpdatedAt: now },
            });
          },
          { maxWait: 10_000, timeout: 30_000 },
        );

        result.refreshed += 1;
        result.offers += offers.length;
        logger.info(`[offers] ${row.slug} refreshed (${offers.length} offers)`);
      } catch (error) {
        result.failed += 1;
        logger.warn(`[offers] ${row.slug} failed: ${String(error)}`);
      }
    }

    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: result.failed > 0 ? "FAILED" : "SUCCESS",
        finishedAt: new Date(),
        itemsIn: result.candidates,
        itemsOut: result.refreshed,
        ...(result.failed > 0 ? { error: `${result.failed} title(s) failed` } : {}),
        meta: { ...result, region },
      },
    });
  } catch (error) {
    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        itemsIn: result.candidates,
        itemsOut: result.refreshed,
        error: String(error),
        meta: { ...result, region },
      },
    });
    throw error;
  }

  return result;
}
