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
