import { expect, test, type Page } from "@playwright/test";

import { E2E_ADMIN, E2E_ADMIN_REPORT_MESSAGE } from "./global-setup";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("Nama pengguna").fill(E2E_ADMIN.username);
  await page.getByLabel("Kata sandi").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("admin routes require a session and reject bad credentials", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  await page.getByLabel("Nama pengguna").fill(E2E_ADMIN.username);
  await page.getByLabel("Kata sandi").fill("definitely-wrong");
  await page.getByRole("button", { name: "Masuk" }).click();

  await expect(page.getByText("Nama pengguna atau kata sandi salah.")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("admin signs in, moderates, edits, reads sync history and signs out", async ({ page }) => {
  await page.context().clearCookies();
  await signIn(page);

  await expect(page.getByRole("heading", { level: 1, name: "Ringkasan" })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Sinkronisasi terakhir" }),
  ).toBeVisible();

  // Reports: resolve the fixture, then confirm it moved to the resolved filter.
  await page.goto("/admin/reports?status=OPEN");
  await expect(page.getByRole("heading", { level: 1, name: "Laporan" })).toBeVisible();

  const reportRow = page.locator("tr", { hasText: E2E_ADMIN_REPORT_MESSAGE });
  await expect(reportRow).toBeVisible();
  await reportRow.getByRole("button", { name: "Selesaikan" }).click();
  await expect(page.getByText(E2E_ADMIN_REPORT_MESSAGE)).toHaveCount(0);

  await page.goto("/admin/reports?status=RESOLVED");
  await expect(page.getByText(E2E_ADMIN_REPORT_MESSAGE)).toBeVisible();

  // Titles: the OWN fixture exposes the stream URL and persists a status change.
  await page.goto("/admin/titles?q=E2E%20Player%20Fixture");
  const titleRow = page.locator("tr", { hasText: "E2E Player Fixture" });
  await expect(titleRow).toBeVisible();
  await titleRow.getByRole("link", { name: "Ubah" }).click();

  await expect(page.getByLabel("URL stream (HLS)")).toHaveValue("/test/fixtures/hls/master.m3u8");
  await page.getByLabel("Status").selectOption("BROKEN");
  const save = page.getByRole("button", { name: "Simpan perubahan" });
  await save.click();
  await expect(page.getByRole("status")).toContainText("disimpan");
  await expect(save).toBeEnabled();

  await page.reload();
  await expect(page.getByLabel("Status")).toHaveValue("BROKEN");

  // Restore LIVE so the player spec that runs afterwards still finds the fixture.
  await page.getByLabel("Status").selectOption("LIVE");
  await page.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page.getByRole("button", { name: "Simpan perubahan" })).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel("Status")).toHaveValue("LIVE");

  // Sync history and manual triggers are rendered for the operator.
  await page.goto("/admin/sync");
  await expect(page.getByRole("heading", { level: 1, name: "Sinkronisasi" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Status worker" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sync katalog" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh offer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bersihkan riwayat" })).toBeVisible();

  // English locale shares the same guards and translations.
  await page.goto("/en/admin");
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/en\/admin\/login$/);

  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => cookie.name === "ongx_admin")).toBe(false);

  await page.goto("/en/admin");
  await expect(page).toHaveURL(/\/en\/admin\/login$/);
});
