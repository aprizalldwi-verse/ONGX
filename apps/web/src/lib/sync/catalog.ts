import { prisma } from "@ongx/db";
import type { CatalogAdapter, NormalizedOffer, NormalizedTitle, Source } from "@ongx/shared";

import { AniListAdapter } from "@/lib/sources/anilist/adapter";
import { TmdbAdapter } from "@/lib/sources/tmdb/adapter";
import { upsertTitle } from "@/lib/titles/upsert";

import { createCounters, type SyncCounters } from "./counters";
import { localLimiter } from "./limiter";
import { consoleLogger, type SyncLogger } from "./logger";

/**
 * Catalog ingestion pipeline shared by `pnpm catalog:sync` and the Phase 9
 * worker. Idempotent: slugs stay stable, relations are replaced, episodes are
 * upserted by `(titleId, season, number)`.
 */

interface SyncOptions {
  /** ISO-3166-1 region used for TMDB provider offers. */
  region: string;
  /** Bypass the 24 h freshness skip (used to backfill new fields). */
  force: boolean;
  logger: SyncLogger;
  /** Extra context stored on the `SyncJob.meta` row (e.g. BullMQ job id). */
  meta?: Record<string, unknown> | undefined;
}

function dedupe(items: NormalizedTitle[]): NormalizedTitle[] {
  const seen = new Set<string>();
  const result: NormalizedTitle[] = [];

  for (const item of items) {
    const key = `${item.source}:${item.kind}:${item.remoteId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

async function syncEpisodes(
  adapter: CatalogAdapter,
  titleId: string,
  title: NormalizedTitle,
  counters: SyncCounters,
  logger: SyncLogger,
): Promise<void> {
  if (!adapter.episodes || title.kind === "MOVIE") return;

  const seasons =
    title.source === "TMDB"
      ? (title.seasons ?? []).slice(0, 2).map((season) => season.number)
      : [1];

  for (const season of seasons) {
    try {
      const episodes = await adapter.episodes(title.remoteId, season);

      for (const episode of episodes) {
        await prisma.episode.upsert({
          where: {
            titleId_season_number: { titleId, season: episode.season, number: episode.number },
          },
          update: {
            name: episode.name,
            synopsis: episode.synopsis ?? null,
            airDate: episode.airDate ? new Date(episode.airDate) : null,
            durationSec: episode.durationSec ?? null,
            stillPath: episode.stillPath ?? null,
          },
          create: {
            titleId,
            season: episode.season,
            number: episode.number,
            name: episode.name,
            synopsis: episode.synopsis ?? null,
            airDate: episode.airDate ? new Date(episode.airDate) : null,
            durationSec: episode.durationSec ?? null,
            stillPath: episode.stillPath ?? null,
          },
        });
        counters.episodes += 1;
      }
    } catch (error) {
      logger.warn(
        `[sync] episode ${title.source}:${title.remoteId} s${season} failed: ${String(error)}`,
      );
    }
  }
}

async function syncSource(
  source: Extract<Source, "TMDB" | "ANILIST">,
  adapter: CatalogAdapter,
  listed: NormalizedTitle[],
  detailLimit: number,
  options: SyncOptions,
): Promise<SyncCounters> {
  const { logger } = options;
  const counters = createCounters();
  const candidates = dedupe(listed);
  counters.listed = candidates.length;

  const job = await prisma.syncJob.create({
    data: {
      source,
      status: "RUNNING",
      meta: { candidates: candidates.length, detailLimit, ...options.meta },
    },
  });

  try {
    for (const candidate of candidates.slice(0, detailLimit)) {
      const existing = await prisma.title.findUnique({
        where: {
          source_kind_remoteId: {
            source: candidate.source,
            kind: candidate.kind,
            remoteId: candidate.remoteId,
          },
        },
        select: { id: true, updatedAt: true },
      });

      const fresh =
        !options.force &&
        existing !== null &&
        Date.now() - existing.updatedAt.getTime() < 24 * 60 * 60 * 1_000;

      if (fresh) {
        counters.skipped += 1;
        continue;
      }

      try {
        const remoteId =
          source === "TMDB"
            ? `${candidate.kind === "MOVIE" ? "movie" : "tv"}:${candidate.remoteId}`
            : candidate.remoteId;

        const detail = await adapter.detail(remoteId);

        // TMDB exposes provider availability through a second endpoint. AniList
        // ships its official streaming links inside `detail` (ASUMSI-034).
        // A failed offers call skips the title instead of wiping existing rows.
        let offers: NormalizedOffer[] = detail.offers;
        if (source === "TMDB") {
          offers = await adapter.offers(remoteId, options.region);
        }

        const result = await upsertTitle(prisma, { ...detail, offers });

        if (result.action === "skipped") {
          counters.skipped += 1;
          continue;
        }

        counters[result.action === "created" ? "created" : "updated"] += 1;
        counters.offers += offers.length;

        if (result.titleId) {
          await syncEpisodes(adapter, result.titleId, detail, counters, logger);
          await prisma.title.update({
            where: { id: result.titleId },
            data: { offersUpdatedAt: new Date() },
          });
        }

        logger.info(
          `[sync:${source}] ${result.action} ${detail.titleId ?? detail.slug} (${detail.kind}, ${offers.length} offers)`,
        );
      } catch (error) {
        counters.failed += 1;
        logger.warn(
          `[sync:${source}] ${candidate.kind}:${candidate.remoteId} failed: ${String(error)}`,
        );
      }
    }

    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: counters.failed > 0 ? "FAILED" : "SUCCESS",
        finishedAt: new Date(),
        itemsIn: counters.listed,
        itemsOut: counters.created + counters.updated,
        ...(counters.failed > 0 ? { error: `${counters.failed} item(s) failed` } : {}),
        meta: { ...counters },
      },
    });
  } catch (error) {
    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        itemsIn: counters.listed,
        itemsOut: counters.created + counters.updated,
        error: String(error),
        meta: { ...counters },
      },
    });
    throw error;
  }

  return counters;
}

async function collectTmdb(adapter: TmdbAdapter, logger: SyncLogger): Promise<NormalizedTitle[]> {
  const requests: Promise<{ items: NormalizedTitle[] }>[] = [
    adapter.trending("MOVIE", 1),
    adapter.trending("MOVIE", 2),
    adapter.trending("SERIES", 1),
    adapter.trending("SERIES", 2),
    adapter.listing("MOVIE", { sort: "popularity" }, 1),
    adapter.listing("MOVIE", { sort: "rating" }, 1),
    adapter.listing("SERIES", { sort: "popularity" }, 1),
    adapter.listing("SERIES", { sort: "rating" }, 1),
  ];

  return collectPages(requests, "tmdb", logger);
}

async function collectAniList(
  adapter: AniListAdapter,
  logger: SyncLogger,
): Promise<NormalizedTitle[]> {
  const requests: Promise<{ items: NormalizedTitle[] }>[] = [
    adapter.trending("SERIES", 1),
    adapter.trending("SERIES", 2),
    adapter.listing("SERIES", { sort: "popularity" }, 1),
    adapter.listing("SERIES", { sort: "rating" }, 1),
  ];

  return collectPages(requests, "anilist", logger);
}

/**
 * One failed discovery page must not abort the whole sync. Details are still
 * fetched per title, and every failure is logged with its source.
 */
async function collectPages(
  requests: Promise<{ items: NormalizedTitle[] }>[],
  label: string,
  logger: SyncLogger,
): Promise<NormalizedTitle[]> {
  const results = await Promise.allSettled(requests);
  const items: NormalizedTitle[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") items.push(...result.value.items);
    else logger.warn(`[sync:${label}] discovery page failed: ${String(result.reason)}`);
  }

  return items;
}

export interface CatalogSyncOptions {
  /** Maximum TMDB detail rows fetched in this run. */
  tmdb: number;
  /** Maximum AniList detail rows fetched in this run. */
  anilist: number;
  /** Ignore the 24 h freshness window. */
  force?: boolean | undefined;
  /** ISO-3166-1 region for provider offers. Defaults to `ID`. */
  region?: string | undefined;
  logger?: SyncLogger | undefined;
  meta?: Record<string, unknown> | undefined;
}

export interface CatalogSyncResult {
  tmdb: SyncCounters;
  anilist: SyncCounters;
}

export async function runCatalogSync(options: CatalogSyncOptions): Promise<CatalogSyncResult> {
  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is missing. Add it to apps/web/.env.local first.");
  }

  const logger = options.logger ?? consoleLogger;
  const region = (options.region ?? process.env.TMDB_REGION ?? "ID").toUpperCase();
  const syncOptions: SyncOptions = {
    region,
    force: options.force ?? false,
    logger,
    ...(options.meta !== undefined ? { meta: options.meta } : {}),
  };

  logger.info(
    `[sync] limits: tmdb=${options.tmdb} anilist=${options.anilist} region=${region} force=${syncOptions.force}`,
  );

  const tmdb = new TmdbAdapter({ apiKey, region, limiter: localLimiter(40, 10_000) });
  const anilist = new AniListAdapter({ limiter: localLimiter(90, 60_000) });

  const tmdbListed = await collectTmdb(tmdb, logger);
  logger.info(`[sync:tmdb] listed ${tmdbListed.length} candidates`);
  const tmdbCounters = await syncSource("TMDB", tmdb, tmdbListed, options.tmdb, syncOptions);

  const anilistListed = await collectAniList(anilist, logger);
  logger.info(`[sync:anilist] listed ${anilistListed.length} candidates`);
  const anilistCounters = await syncSource(
    "ANILIST",
    anilist,
    anilistListed,
    options.anilist,
    syncOptions,
  );

  return { tmdb: tmdbCounters, anilist: anilistCounters };
}
