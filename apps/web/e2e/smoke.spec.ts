import { expect, test } from "@playwright/test";

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
