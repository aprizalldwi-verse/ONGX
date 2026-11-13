/**
 * One-shot catalog ingestion used while the Phase 9 worker does not exist.
 *
 * Run with: pnpm catalog:sync [--limit=120] [--tmdb=100] [--anilist=60] [--force]
 *
 * Idempotent: `upsertTitle` keeps slugs stable and replaces genres, credits and
 * offers; episodes are upserted by (titleId, season, number). `--force` bypasses
 * the 24 h freshness skip so a schema/normalization change can backfill rows.
 */
import { prisma } from "@ongx/db";
import type { CatalogAdapter, NormalizedOffer, NormalizedTitle, Source } from "@ongx/shared";

import { AniListAdapter } from "@/lib/sources/anilist/adapter";
import { TmdbAdapter } from "@/lib/sources/tmdb/adapter";
import type { RateLimiter } from "@/lib/rate-limit";
import { upsertTitle } from "@/lib/titles/upsert";

interface SyncCounters {
  listed: number;
  created: number;
  updated: number;
  skipped: number;
  episodes: number;
  offers: number;
  failed: number;
}

function createCounters(): SyncCounters {
  return { listed: 0, created: 0, updated: 0, skipped: 0, episodes: 0, offers: 0, failed: 0 };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** In-process fixed-window limiter (the Redis helper is server-only). */
function localLimiter(limit: number, windowMs: number): RateLimiter {
  const timestamps: number[] = [];

  return {
    async acquire(): Promise<void> {
      for (;;) {
        const now = Date.now();
        while (timestamps.length > 0 && now - (timestamps[0] ?? 0) >= windowMs) {
          timestamps.shift();
        }

        if (timestamps.length < limit) {
          timestamps.push(now);
          return;
        }

        await sleep(windowMs - (now - (timestamps[0] ?? now)));
      }
    },
  };
}

function parseArgs(): { tmdb: number; anilist: number; force: boolean } {
  const args = new Map(
    process.argv
      .slice(2)
      .filter((arg) => arg.startsWith("--"))
      .map((arg) => {
        const [key, value] = arg.replace(/^--/, "").split("=");
        return [key ?? "", value ?? ""] as const;
      }),
  );

  const total = Number.parseInt(args.get("limit") ?? "", 10);
  const tmdb = Number.parseInt(args.get("tmdb") ?? "", 10);
  const anilist = Number.parseInt(args.get("anilist") ?? "", 10);
  const force = args.has("force");

  if (Number.isFinite(total) && total > 0) {
    return { tmdb: Math.round(total * 0.62), anilist: Math.round(total * 0.38), force };
  }

  return {
    tmdb: Number.isFinite(tmdb) && tmdb > 0 ? tmdb : 100,
    anilist: Number.isFinite(anilist) && anilist > 0 ? anilist : 60,
    force,
  };
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
      console.warn(
        `[sync] episode ${title.source}:${title.remoteId} s${season} failed: ${String(error)}`,
      );
    }
  }
}

interface SyncOptions {
  /** ISO-3166-1 region used for TMDB provider offers. */
  region: string;
  /** Bypass the 24 h freshness skip (used to backfill new fields). */
  force: boolean;
}

async function syncSource(
  source: Extract<Source, "TMDB" | "ANILIST">,
  adapter: CatalogAdapter,
  listed: NormalizedTitle[],
  detailLimit: number,
  options: SyncOptions,
): Promise<SyncCounters> {
  const counters = createCounters();
  const candidates = dedupe(listed);
  counters.listed = candidates.length;

  const job = await prisma.syncJob.create({
    data: { source, status: "RUNNING", meta: { candidates: candidates.length, detailLimit } },
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
          await syncEpisodes(adapter, result.titleId, detail, counters);
        }

        console.log(
          `[sync:${source}] ${result.action} ${detail.titleId ?? detail.slug} (${detail.kind}, ${offers.length} offers)`,
        );
      } catch (error) {
        counters.failed += 1;
        console.warn(
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

async function collectTmdb(adapter: TmdbAdapter): Promise<NormalizedTitle[]> {
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

  return collectPages(requests, "tmdb");
}

async function collectAniList(adapter: AniListAdapter): Promise<NormalizedTitle[]> {
  const requests: Promise<{ items: NormalizedTitle[] }>[] = [
    adapter.trending("SERIES", 1),
    adapter.trending("SERIES", 2),
    adapter.listing("SERIES", { sort: "popularity" }, 1),
    adapter.listing("SERIES", { sort: "rating" }, 1),
  ];

  return collectPages(requests, "anilist");
}

/**
 * One failed discovery page must not abort the whole sync. Details are still
 * fetched per title, and every failure is logged with its source.
 */
async function collectPages(
  requests: Promise<{ items: NormalizedTitle[] }>[],
  label: string,
): Promise<NormalizedTitle[]> {
  const results = await Promise.allSettled(requests);
  const items: NormalizedTitle[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") items.push(...result.value.items);
    else console.warn(`[sync:${label}] discovery page failed: ${String(result.reason)}`);
  }

  return items;
}

async function main(): Promise<void> {
  if (!process.env.TMDB_API_KEY?.trim()) {
    throw new Error("TMDB_API_KEY is missing. Add it to apps/web/.env.local first.");
  }

  const limits = parseArgs();
  const region = (process.env.TMDB_REGION ?? "ID").toUpperCase();
  const options: SyncOptions = { region, force: limits.force };
  console.log(
    `[sync] limits: tmdb=${limits.tmdb} anilist=${limits.anilist} region=${region} force=${limits.force}`,
  );

  const tmdb = new TmdbAdapter({
    apiKey: process.env.TMDB_API_KEY,
    region,
    limiter: localLimiter(40, 10_000),
  });
  const anilist = new AniListAdapter({ limiter: localLimiter(90, 60_000) });

  const tmdbListed = await collectTmdb(tmdb);
  console.log(`[sync:tmdb] listed ${tmdbListed.length} candidates`);
  const tmdbCounters = await syncSource("TMDB", tmdb, tmdbListed, limits.tmdb, options);

  const anilistListed = await collectAniList(anilist);
  console.log(`[sync:anilist] listed ${anilistListed.length} candidates`);
  const anilistCounters = await syncSource(
    "ANILIST",
    anilist,
    anilistListed,
    limits.anilist,
    options,
  );

  console.log("[sync] done", {
    tmdb: tmdbCounters,
    anilist: anilistCounters,
    totalTitles: await prisma.title.count(),
    totalEpisodes: await prisma.episode.count(),
    totalOffers: await prisma.watchOffer.count(),
  });
}

main()
  .catch((error) => {
    console.error("[sync] fatal", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
