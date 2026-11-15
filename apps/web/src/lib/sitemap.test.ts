import { describe, expect, it } from "vitest";

import {
  chunkCount,
  escapeXml,
  SITEMAP_CHUNK_SIZE,
  sitemapIndexXml,
  sitemapUrlSetXml,
} from "./sitemap";

describe("sitemap chunking", () => {
  it("always returns at least one chunk", () => {
    expect(chunkCount(0)).toBe(1);
    expect(chunkCount(1)).toBe(1);
    expect(chunkCount(SITEMAP_CHUNK_SIZE)).toBe(1);
    expect(chunkCount(SITEMAP_CHUNK_SIZE + 1)).toBe(2);
    expect(chunkCount(SITEMAP_CHUNK_SIZE * 3)).toBe(3);
  });
});

describe("sitemap XML", () => {
  it("lists every chunk as an absolute URL", () => {
    const xml = sitemapIndexXml("https://ongx.test", 2);

    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("<loc>https://ongx.test/sitemap/1.xml</loc>");
    expect(xml).toContain("<loc>https://ongx.test/sitemap/2.xml</loc>");
  });

  it("emits hreflang alternates and lastmod for each URL", () => {
    const xml = sitemapUrlSetXml("https://ongx.test", [
      { path: "/film/x", lastModified: new Date("2026-01-02T03:04:05.000Z") },
      { path: "/" },
    ]);

    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml).toContain("<loc>https://ongx.test/film/x</loc>");
    expect(xml).toContain("<lastmod>2026-01-02T03:04:05.000Z</lastmod>");
    expect(xml).toContain('hreflang="id" href="https://ongx.test/film/x"');
    expect(xml).toContain('hreflang="en" href="https://ongx.test/en/film/x"');
    expect(xml).toContain('hreflang="x-default" href="https://ongx.test/film/x"');
    expect(xml).toContain("<loc>https://ongx.test/</loc>");
    expect(xml).toContain('hreflang="en" href="https://ongx.test/en"');
  });

  it("escapes XML-sensitive characters", () => {
    expect(escapeXml(`A & B <tag> "quoted" 'single'`)).toBe(
      "A &amp; B &lt;tag&gt; &quot;quoted&quot; &apos;single&apos;",
    );
  });
});
