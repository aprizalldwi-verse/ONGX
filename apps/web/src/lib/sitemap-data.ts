import "server-only";

import { prisma } from "@/lib/prisma";
import { episodePath, titlePath } from "@/lib/titles/slug";

import type { SitemapEntry } from "./sitemap";

/**
 * Ordered list of public, indexable paths. Search results, watch shells and the
 * device-local library pages are intentionally absent (they are noindex).
 */
export const STATIC_PATHS: readonly string[] = [
  "/",
  "/film",
  "/series",
  "/anime",
  "/trending",
  "/baru",
  "/tentang",
  "/kontak",
  "/privasi",
  "/syarat",
  "/dmca",
];

interface Counts {
  genres: number;
  titles: number;
  episodes: number;
  people: number;
}

interface Slice {
  skip: number;
  take: number;
}

function sliceFor(offset: number, count: number, start: number, end: number): Slice | undefined {
  const from = Math.max(start, offset);
  const to = Math.min(end, offset + count);
  if (to <= from) return undefined;
  return { skip: from - offset, take: to - from };
}

async function counts(): Promise<Counts> {
  const [genres, titles, episodes, people] = await Promise.all([
    prisma.genre.count(),
    prisma.title.count({ where: { status: "LIVE" } }),
    prisma.episode.count({ where: { title: { status: "LIVE" } } }),
    prisma.person.count({ where: { credits: { some: { title: { status: "LIVE" } } } } }),
  ]);

  return { genres, titles, episodes, people };
}

function totalOf(count: Counts): number {
  return STATIC_PATHS.length + count.genres + count.titles + count.episodes + count.people;
}

export async function getSitemapTotal(): Promise<number> {
  return totalOf(await counts());
}

/**
 * One chunk of the sitemap. Each source is ordered deterministically and only
 * the intersection with `[start, end)` is fetched, so a large catalog never
 * loads every row just to serve one chunk.
 */
export async function getSitemapPage(
  page: number,
  size: number,
): Promise<{ total: number; entries: SitemapEntry[] }> {
  const count = await counts();
  const total = totalOf(count);
  const start = Math.max(0, (page - 1) * size);
  const end = Math.min(start + size, total);
  const entries: SitemapEntry[] = [];

  if (start >= total) return { total, entries };

  for (const path of STATIC_PATHS.slice(start, Math.min(end, STATIC_PATHS.length))) {
    entries.push({ path });
  }

  let offset = STATIC_PATHS.length;

  const genreSlice = sliceFor(offset, count.genres, start, end);
  if (genreSlice !== undefined) {
    const rows = await prisma.genre.findMany({
      orderBy: { slug: "asc" },
      skip: genreSlice.skip,
      take: genreSlice.take,
      select: { slug: true },
    });
    entries.push(...rows.map((row) => ({ path: `/genre/${row.slug}` })));
  }
  offset += count.genres;

  const titleSlice = sliceFor(offset, count.titles, start, end);
  if (titleSlice !== undefined) {
    const rows = await prisma.title.findMany({
      where: { status: "LIVE" },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: titleSlice.skip,
      take: titleSlice.take,
      select: { slug: true, kind: true, source: true, updatedAt: true },
    });
    entries.push(
      ...rows.map((row) => ({
        path: titlePath(row.kind === "SERIES" ? "SERIES" : "MOVIE", row.slug, row.source),
        lastModified: row.updatedAt,
      })),
    );
  }
  offset += count.titles;

  const episodeSlice = sliceFor(offset, count.episodes, start, end);
  if (episodeSlice !== undefined) {
    const rows = await prisma.episode.findMany({
      where: { title: { status: "LIVE" } },
      orderBy: [{ titleId: "asc" }, { season: "asc" }, { number: "asc" }],
      skip: episodeSlice.skip,
      take: episodeSlice.take,
      select: {
        season: true,
        number: true,
        title: { select: { slug: true, source: true, updatedAt: true } },
      },
    });
    entries.push(
      ...rows.map((row) => ({
        path: episodePath(row.title.source, row.title.slug, row.season, row.number),
        lastModified: row.title.updatedAt,
      })),
    );
  }
  offset += count.episodes;

  const personSlice = sliceFor(offset, count.people, start, end);
  if (personSlice !== undefined) {
    const rows = await prisma.person.findMany({
      where: { credits: { some: { title: { status: "LIVE" } } } },
      orderBy: { id: "asc" },
      skip: personSlice.skip,
      take: personSlice.take,
      select: { slug: true },
    });
    entries.push(...rows.map((row) => ({ path: `/orang/${row.slug}` })));
  }

  return { total, entries };
}
