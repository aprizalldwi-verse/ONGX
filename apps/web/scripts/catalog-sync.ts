/**
 * One-shot catalog ingestion. The same pipeline backs the Phase 9 worker
 * (`pnpm worker`), which schedules it instead of a human running this file.
 *
 * Run with: pnpm catalog:sync [--limit=120] [--tmdb=100] [--anilist=60] [--force]
 *
 * Idempotent: `upsertTitle` keeps slugs stable and replaces genres, credits and
 * offers; episodes are upserted by (titleId, season, number). `--force` bypasses
 * the 24 h freshness skip so a schema/normalization change can backfill rows.
 */
import { prisma } from "@ongx/db";

import { runCatalogSync } from "@/lib/sync/catalog";

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

async function main(): Promise<void> {
  const limits = parseArgs();
  const result = await runCatalogSync({
    tmdb: limits.tmdb,
    anilist: limits.anilist,
    force: limits.force,
    meta: { job: "cli" },
  });

  console.log("[sync] done", {
    tmdb: result.tmdb,
    anilist: result.anilist,
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
