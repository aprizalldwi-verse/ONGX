/**
 * Sitemap serialization. Splitting happens at the data layer; this module only
 * knows how to turn paths into valid XML with `hreflang` alternates.
 */

export const SITEMAP_CHUNK_SIZE = 45_000;

const XHTML_NS = "http://www.w3.org/1999/xhtml";

export interface SitemapEntry {
  /** Unlocalized public path, e.g. `/film/the-last-attack-2024`. */
  path: string;
  lastModified?: Date | undefined;
}

export function chunkCount(total: number, size = SITEMAP_CHUNK_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / size));
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function withBase(baseUrl: string, path: string): string {
  const normal = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl.replace(/\/+$/, "")}${normal}`;
}

function englishPath(path: string): string {
  const normal = path.startsWith("/") ? path : `/${path}`;
  return normal === "/" ? "/en" : `/en${normal}`;
}

export function sitemapIndexXml(baseUrl: string, chunks: number, lastModified?: Date): string {
  const entries = Array.from({ length: chunks }, (_, index) => {
    const number = index + 1;
    const loc = escapeXml(`${baseUrl.replace(/\/+$/, "")}/sitemap/${number}.xml`);
    const lastmod =
      lastModified !== undefined ? `<lastmod>${lastModified.toISOString()}</lastmod>` : "";
    return `<sitemap><loc>${loc}</loc>${lastmod}</sitemap>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`;
}

export function sitemapUrlSetXml(baseUrl: string, entries: readonly SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const idUrl = withBase(baseUrl, entry.path);
      const enUrl = withBase(baseUrl, englishPath(entry.path));
      const lastmod =
        entry.lastModified !== undefined
          ? `<lastmod>${entry.lastModified.toISOString()}</lastmod>`
          : "";
      const alternates =
        `<xhtml:link rel="alternate" hreflang="id" href="${escapeXml(idUrl)}"/>` +
        `<xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enUrl)}"/>` +
        `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(idUrl)}"/>`;

      return `<url><loc>${escapeXml(idUrl)}</loc>${lastmod}${alternates}</url>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="${XHTML_NS}">${urls}</urlset>`;
}
