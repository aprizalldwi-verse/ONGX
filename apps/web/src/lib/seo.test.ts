import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  absoluteUrl,
  alternatesFor,
  clampDescription,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  localizedPath,
  pageMetadata,
  siteUrl,
} from "./seo";

const previous = process.env.NEXT_PUBLIC_SITE_URL;

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://ongx.test";
});

afterAll(() => {
  if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = previous;
});

describe("seo url helpers", () => {
  it("normalizes the site origin and absolute paths", () => {
    expect(siteUrl()).toBe("https://ongx.test");
    expect(absoluteUrl("/film/x")).toBe("https://ongx.test/film/x");
    expect(absoluteUrl("film/x")).toBe("https://ongx.test/film/x");
  });

  it("keeps the default locale unprefixed and prefixes en", () => {
    expect(localizedPath("/film/x", "id")).toBe("/film/x");
    expect(localizedPath("/film/x", "en")).toBe("/en/film/x");
    expect(localizedPath("/", "en")).toBe("/en");
  });

  it("emits absolute canonical plus id/en/x-default alternates", () => {
    expect(alternatesFor("/film/x", "en")).toEqual({
      canonical: "https://ongx.test/en/film/x",
      languages: {
        id: "https://ongx.test/film/x",
        en: "https://ongx.test/en/film/x",
        "x-default": "https://ongx.test/film/x",
      },
    });
  });
});

describe("clampDescription", () => {
  it("keeps a long synopsis inside 150–160 characters at a word boundary", () => {
    const value = `${"Petualangan seru di kota besar ".repeat(10)}selesai.`;
    const result = clampDescription(value, "id");

    expect(result.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    expect(result.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(result.endsWith("…")).toBe(true);
  });

  it("extends a short synopsis with locale-aware filler", () => {
    const result = clampDescription("Film pendek.", "id");

    expect(result.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    expect(result.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(result.startsWith("Film pendek.")).toBe(true);
  });

  it("uses the fallback when the synopsis is empty, then fills", () => {
    const result = clampDescription(null, "en", "A short fallback.");

    expect(result.startsWith("A short fallback.")).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    expect(result.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("always returns a bounded description even without any input", () => {
    const result = clampDescription("", "id");

    expect(result.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    expect(result.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });
});

describe("pageMetadata", () => {
  it("produces absolute canonical, hreflang, OpenGraph and Twitter tags", () => {
    const metadata = pageMetadata({
      title: "The Last Attack",
      description: "Deskripsi",
      path: "/film/the-last-attack-2024",
      locale: "id",
      type: "video.movie",
    });

    expect(metadata.title).toBe("The Last Attack");
    expect(metadata.alternates?.canonical).toBe("https://ongx.test/film/the-last-attack-2024");
    expect(metadata.alternates?.languages).toMatchObject({
      id: "https://ongx.test/film/the-last-attack-2024",
      en: "https://ongx.test/en/film/the-last-attack-2024",
    });
    expect(metadata.openGraph).toMatchObject({
      type: "video.movie",
      url: "https://ongx.test/film/the-last-attack-2024",
      siteName: "ONGX",
      locale: "id_ID",
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("marks noindex pages while keeping follow enabled", () => {
    const metadata = pageMetadata({
      title: "Search",
      description: "Deskripsi",
      path: "/cari",
      locale: "en",
      noindex: true,
    });

    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
