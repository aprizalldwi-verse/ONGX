import { SITEMAP_CHUNK_SIZE, chunkCount, sitemapIndexXml } from "@/lib/sitemap";
import { getSitemapTotal } from "@/lib/sitemap-data";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET() {
  const total = await getSitemapTotal();
  const chunks = chunkCount(total, SITEMAP_CHUNK_SIZE);

  return new Response(sitemapIndexXml(siteUrl(), chunks), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600",
    },
  });
}
