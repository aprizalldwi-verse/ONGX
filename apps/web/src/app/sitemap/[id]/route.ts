import { SITEMAP_CHUNK_SIZE, chunkCount, sitemapUrlSetXml } from "@/lib/sitemap";
import { getSitemapPage } from "@/lib/sitemap-data";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  const page = Number.parseInt(id.replace(/\.xml$/i, ""), 10);

  if (!Number.isInteger(page) || page < 1) {
    return new Response("Not found", { status: 404 });
  }

  const { total, entries } = await getSitemapPage(page, SITEMAP_CHUNK_SIZE);
  if (page > chunkCount(total, SITEMAP_CHUNK_SIZE)) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(sitemapUrlSetXml(siteUrl(), entries), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600",
    },
  });
}
