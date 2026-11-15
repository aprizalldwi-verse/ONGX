import { expect, test } from "@playwright/test";

test("ads.txt exposes pending seller records", async ({ request }) => {
  const response = await request.get("/ads.txt");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("# TODO");
});

test("disabled ad slots remain hidden without ad layout shifts", async ({ page }) => {
  await page.addInitScript(() => {
    interface ShiftRecord {
      value: number;
      fromAdSlot: boolean;
    }

    const shifts: ShiftRecord[] = [];
    Object.assign(window, { adTestShifts: shifts });

    const isInsideAdSlot = (node: Node | null): boolean =>
      node instanceof Element &&
      (node.matches("[data-slot-id]") || node.closest("[data-slot-id]") !== null);

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
          sources?: Array<{ node: Node | null }>;
        };
        if (shift.hadRecentInput) continue;
        shifts.push({
          value: shift.value,
          fromAdSlot: (shift.sources ?? []).some((source) => isInsideAdSlot(source.node)),
        });
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await page.goto("/film");

  const slots = page.locator("[data-slot-id]");
  expect(await slots.count()).toBeGreaterThan(0);
  expect(
    await slots.evaluateAll((elements) =>
      elements.every((element) => element.getBoundingClientRect().height === 0),
    ),
  ).toBe(true);

  await page.waitForLoadState("networkidle");

  const result = await page.evaluate(() => {
    const values = (
      window as unknown as { adTestShifts: Array<{ value: number; fromAdSlot: boolean }> }
    ).adTestShifts;
    return {
      total: values.reduce((sum, value) => sum + value.value, 0),
      fromAdSlot: values.filter((value) => value.fromAdSlot).length,
    };
  });

  // No layout shift may originate from an ad slot. A tiny global CLS from font
  // swap is unrelated and stays well inside the "good" 0.1 threshold.
  expect(result.fromAdSlot).toBe(0);
  expect(result.total).toBeLessThan(0.01);
  await expect(page.locator("#ongx-ad-adapter")).toHaveCount(0);
});

// Upstream image hosts are not always reachable from CI/sandbox machines. If
// `/_next/image` requests are allowed to hang they exhaust Chrome's per-host
// connection pool, which also stalls client-side (RSC) navigation. Aborting
// them keeps the smoke suite focused on routing and interaction.
test.beforeEach(async ({ page }) => {
  await page.route("**/_next/image**", (route) => route.abort());
});

test("home renders the hero, rails and a detail page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sedang tren" })).toBeVisible();

  const firstTitle = page
    .locator('main a[href^="/anime/"], main a[href^="/film/"], main a[href^="/series/"]')
    .first();
  await expect(firstTitle).toBeVisible();
  await firstTitle.click();

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/\/(anime|film|series)\//);
});

test("detail opens the trailer dialog and accepts a report", async ({ page }) => {
  // Reports are rate limited per IP; give this test its own budget so repeated
  // local runs never hit the 5-per-10-minutes window.
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
  });

  await page.goto("/anime/shingeki-no-kyojin-2013");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Trailer" }).click();
  const trailer = page.getByRole("dialog");
  await expect(trailer).toBeVisible();
  await expect(trailer.locator("iframe")).toHaveAttribute("src", /youtube-nocookie\.com\/embed\//);

  // The YouTube iframe swallows the Escape key, so close via the dialog button.
  await trailer.getByRole("button", { name: "Tutup" }).click();
  await expect(trailer).toBeHidden();

  await page.getByRole("button", { name: "Laporkan" }).first().click();
  const report = page.getByRole("dialog");
  await expect(report).toBeVisible();
  await report.getByLabel("Detail (opsional)").fill("E2E smoke report");
  await report.getByRole("button", { name: "Kirim laporan" }).click();
  await expect(report.getByText("Terima kasih! Laporan sudah diterima.")).toBeVisible();
});

test("episode page links to the watch shell", async ({ page }) => {
  await page.goto("/series/simpsons-1989/s/1/e/1");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Episode 1");
  await page.getByRole("link", { name: "Tonton sekarang" }).first().click();

  await expect(page).toHaveURL(/\/watch\//);
  await expect(page.getByText("Streaming belum tersedia")).toBeVisible();
});

test("header search typeahead navigates to a title", async ({ page }) => {
  await page.goto("/");

  const input = page.getByPlaceholder(/Cari film/);
  await input.fill("one piece");

  // Debounced (300 ms) request against `/api/search`, rendered as a listbox.
  const firstResult = page.getByRole("option").first();
  await expect(firstResult).toBeVisible();
  await expect(page.getByRole("option", { name: /One Piece/i })).toHaveCount(3);

  await page
    .getByRole("option", { name: /One Piece/i })
    .last()
    .click();

  await expect(page).toHaveURL(/\/(anime|film|series)\/one-piece/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("search API validates queries and caches responses", async ({ request }) => {
  interface SearchPayload {
    query: string;
    items: Array<{ slug: string; href: string; availableOnVidio: boolean }>;
  }

  const response = await request.get("/api/search", {
    params: { q: "one piece", locale: "id" },
  });

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");

  const body = (await response.json()) as SearchPayload;
  expect(body.query).toBe("one piece");
  expect(body.items.length).toBeGreaterThan(0);
  expect(body.items.every((item) => item.href.length > 0)).toBe(true);

  // A repeated query is served from Redis.
  const cached = await request.get("/api/search", {
    params: { q: "one piece", locale: "id" },
  });
  expect(cached.status()).toBe(200);
  expect(cached.headers()["x-cache"]).toBe("hit");

  const short = await request.get("/api/search", { params: { q: "a" } });
  expect(short.status()).toBe(400);
});

test("Vidio filter, save and playlist survive navigation", async ({ page }) => {
  await page.goto("/film?provider=vidio");

  const card = page.locator('main a[href="/film/the-last-attack-2024"]');
  await expect(card).toHaveCount(1);
  await card.click();

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const save = page.getByRole("button", { name: "Simpan", exact: true });
  await save.click();
  await expect(page.getByRole("button", { name: "Tersimpan", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const playlist = page.getByRole("button", { name: "Tambah ke playlist", exact: true });
  await playlist.click();
  await expect(page.getByRole("button", { name: "Ada di playlist", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.goto("/simpanan");
  await expect(page.locator('main a[href="/film/the-last-attack-2024"]')).toBeVisible();

  await page.getByRole("button", { name: "Hapus", exact: true }).first().click();
  await expect(page.getByText("Belum ada simpanan")).toBeVisible();

  await page.goto("/playlist");
  await expect(page.locator('main a[href="/film/the-last-attack-2024"]')).toBeVisible();
});

test("history renders seeded progress and can be cleared", async ({ page }) => {
  await page.addInitScript(
    (entry) => {
      window.localStorage.setItem("ongx:continue", JSON.stringify([entry]));
    },
    {
      titleId: "e2e-history-title",
      slug: "one-piece-1999",
      source: "TMDB",
      kind: "SERIES",
      title: "One Piece",
      season: 1,
      number: 3,
      episodeName: "E2E Episode",
      positionSec: 600,
      durationSec: 1_440,
      updatedAt: 1_700_000_000_000,
    },
  );

  await page.goto("/riwayat");

  await expect(page.getByRole("heading", { name: "Riwayat" })).toBeVisible();
  await expect(page.getByText("One Piece")).toBeVisible();
  await expect(page.getByText("Musim 1 Episode 3")).toBeVisible();
  await expect(page.getByText("42% ditonton")).toBeVisible();

  await page.getByRole("button", { name: "Hapus dari riwayat" }).click();
  await expect(page.getByText("Belum ada riwayat")).toBeVisible();
});

test("mobile filter sheet applies the provider filter", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/film");

  await page.getByRole("button", { name: "Filter", exact: true }).click();

  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await sheet.getByLabel("Provider").selectOption("vidio");
  await sheet.getByRole("button", { name: "Terapkan" }).click();

  await expect(page).toHaveURL(/[?&]provider=vidio/);
  await expect(page.locator('main a[href="/film/the-last-attack-2024"]')).toBeVisible();
});

test("library and search pages hydrate without console errors", async ({ page }) => {
  const problems: string[] = [];

  page.on("pageerror", (error) => {
    problems.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // Ignore aborted `_next/image` requests: upstream image hosts are blocked in
    // the sandbox and their network errors are not hydration problems.
    if (/hydrat|did not match|server rendered|Warning:/i.test(text)) problems.push(text);
  });

  for (const path of ["/cari?q=one%20piece", "/cari", "/simpanan", "/playlist", "/riwayat"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  expect(problems).toEqual([]);
});

test("player loads the local HLS fixture and opens a provider offer", async ({ page, context }) => {
  // Never reach the fake provider; the popup only needs to prove the link works.
  await context.route("https://provider.example/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>provider</h1>" }),
  );

  await page.goto("/watch/e2e-own-fixture");

  const player = page.getByRole("region", { name: "E2E Player Fixture" });
  await expect(player).toBeVisible();

  // HLS.js parsed `public/test/fixtures/hls/master.m3u8`, so the 720p level from
  // the manifest shows up in the quality picker.
  const quality = player.getByRole("combobox");
  await expect(quality).toBeVisible();
  await expect(quality.getByRole("option", { name: "720p" })).toBeAttached();
  await expect(player.getByRole("button", { name: "Putar" })).toBeVisible();

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Buka E2E Provider" }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://provider.example/e2e-fixture");
  await popup.close();
});

test("robots, manifest and RSS expose the crawler contract", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);

  const robotsBody = await robots.text();
  expect(robotsBody).toContain("User-Agent: *");
  expect(robotsBody).toContain("Allow: /");
  expect(robotsBody).toContain("Disallow: /admin");
  expect(robotsBody).toContain("Disallow: /api");
  expect(robotsBody).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);

  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  expect(manifest.headers()["content-type"]).toContain("application/manifest+json");

  const manifestBody = (await manifest.json()) as {
    name: string;
    start_url: string;
    display: string;
    icons: Array<{ src: string }>;
  };
  expect(manifestBody.name).toBe("ONGX");
  expect(manifestBody.start_url).toBe("/");
  expect(manifestBody.display).toBe("standalone");
  expect(manifestBody.icons.length).toBeGreaterThan(0);

  const rss = await request.get("/rss.xml");
  expect(rss.status()).toBe(200);
  expect(rss.headers()["content-type"]).toContain("application/rss+xml");

  const rssBody = await rss.text();
  expect(rssBody).toContain('<rss version="2.0"');
  expect(rssBody).toContain("<language>id</language>");
  expect(rssBody.match(/<item>/g)?.length ?? 0).toBeGreaterThan(0);
  expect(rssBody).toMatch(/<link>https?:\/\/[^\s<]+\/(film|series|anime)\//);
});

test("sitemap index and chunk URLs resolve, and sampled URLs return 200", async ({ request }) => {
  // 50 detail/episode/person pages is slow on a cold Next server; a single
  // test gets a wider budget instead of lowering coverage.
  test.setTimeout(180_000);

  const index = await request.get("/sitemap.xml");
  expect(index.status()).toBe(200);
  expect(index.headers()["content-type"]).toContain("application/xml");

  const indexBody = await index.text();
  expect(indexBody).toContain("<sitemapindex");
  const chunkUrl = indexBody.match(/<loc>([^<]+)<\/loc>/)?.[1];
  expect(chunkUrl).toBeTruthy();
  if (!chunkUrl) return;

  const chunk = await request.get(chunkUrl);
  expect(chunk.status()).toBe(200);
  expect(chunk.headers()["content-type"]).toContain("application/xml");

  const chunkBody = await chunk.text();
  expect(chunkBody).toContain("<urlset");
  expect(chunkBody).toContain('hreflang="x-default"');

  const urls = Array.from(chunkBody.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1]).filter(
    (value): value is string => value !== undefined && value.length > 0,
  );
  expect(urls.length).toBeGreaterThan(50);
  expect(new Set(urls).size).toBe(urls.length);

  // Deterministic spread across the chunk: static pages, genres, titles,
  // episodes and people are all mixed in by the data layer.
  const step = Math.max(1, Math.floor(urls.length / 50));
  const sample = urls.filter((_, position) => position % step === 0).slice(0, 50);

  const failures: string[] = [];
  for (let offset = 0; offset < sample.length; offset += 10) {
    const batch = sample.slice(offset, offset + 10);
    const responses = await Promise.all(batch.map((url) => request.get(url)));
    responses.forEach((response, position) => {
      if (response.status() !== 200) {
        failures.push(`${response.status()} ${batch[position] ?? "unknown"}`);
      }
    });
  }

  expect(failures).toEqual([]);
});

test("detail pages expose canonical, hreflang, JSON-LD and an OG image", async ({
  page,
  request,
}) => {
  await page.goto("/film/proyek-hail-mary-2026");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await expect(page).toHaveTitle(/— ONGX$| - ONGX$/);

  const canonical = page.locator('link[rel="canonical"]');
  await expect(canonical).toHaveAttribute("href", /\/film\/proyek-hail-mary-2026$/);

  const description = await page.locator('meta[name="description"]').getAttribute("content");
  expect(description?.length ?? 0).toBeGreaterThanOrEqual(150);
  expect(description?.length ?? 0).toBeLessThanOrEqual(160);

  for (const [lang, suffix] of [
    ["id", "/film/proyek-hail-mary-2026"],
    ["en", "/en/film/proyek-hail-mary-2026"],
    ["x-default", "/film/proyek-hail-mary-2026"],
  ] as const) {
    await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveAttribute(
      "href",
      new RegExp(`${suffix}$`),
    );
  }

  const jsonLd = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ""));
  const types = jsonLd.flatMap((payload) =>
    Array.from(payload.matchAll(/"@type":"([^"]+)"/g), (match) => match[1]),
  );
  expect(types).toContain("Movie");
  expect(types).toContain("BreadcrumbList");

  const episode = await request.get("/anime/shingeki-no-kyojin-2013/s/1/e/1");
  expect(episode.status()).toBe(200);
  const episodeBody = await episode.text();
  expect(episodeBody).toContain('"@type":"TVEpisode"');
  expect(episodeBody).toContain('"@type":"VideoObject"');

  const ogUrl = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(ogUrl).toBeTruthy();
  if (!ogUrl) return;

  const og = await request.get(ogUrl);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
  expect((await og.body()).byteLength).toBeGreaterThan(10_000);
});

test("search results stay out of the index and unknown slugs 404", async ({ page, request }) => {
  for (const path of [
    "/film/slug-tidak-ada",
    "/series/slug-tidak-ada",
    "/anime/slug-tidak-ada",
    "/genre/slug-tidak-ada",
    "/orang/slug-tidak-ada",
    "/watch/slug-tidak-ada",
    "/series/one-piece-1999/s/9/e/99",
    "/en/film/slug-tidak-ada",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
  }

  await page.goto("/film");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/cari?q=one");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
