import { prisma } from "@/lib/prisma";
import { absoluteUrl, siteUrl } from "@/lib/seo";
import { escapeXml } from "@/lib/sitemap";
import { titlePath } from "@/lib/titles/slug";

export const dynamic = "force-dynamic";

const CHANNEL_DESCRIPTION =
  "Katalog film, series, dan anime dengan tautan langsung ke provider resmi. Cepat, ringan, mobile-first.";

/** Latest 50 live titles, newest metadata update first. */
export async function GET() {
  const rows = await prisma.title.findMany({
    where: { status: "LIVE" },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: 50,
    select: {
      slug: true,
      kind: true,
      source: true,
      titleId: true,
      titleEn: true,
      synopsis: true,
      updatedAt: true,
    },
  });

  const base = siteUrl();
  const items = rows
    .map((row) => {
      const title = row.titleId || row.titleEn || row.slug;
      const href = absoluteUrl(
        titlePath(row.kind === "SERIES" ? "SERIES" : "MOVIE", row.slug, row.source),
      );
      const description = row.synopsis
        ? `<description>${escapeXml(row.synopsis)}</description>`
        : "";

      return (
        `<item><title>${escapeXml(title)}</title>` +
        `<link>${escapeXml(href)}</link>` +
        `<guid isPermaLink="true">${escapeXml(href)}</guid>` +
        `<pubDate>${row.updatedAt.toUTCString()}</pubDate>` +
        `${description}</item>`
      );
    })
    .join("");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">` +
    `<channel><title>ONGX</title><link>${base}/</link>` +
    `<description>${escapeXml(CHANNEL_DESCRIPTION)}</description>` +
    `<language>id</language>` +
    `<atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml"/>` +
    `${items}</channel></rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=900",
    },
  });
}
