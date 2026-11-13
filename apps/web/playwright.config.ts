import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke suite against the production build. `pnpm e2e` expects `pnpm build` to
 * have run first; the web server is reused when one is already listening.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  // Seeds the `Source.OWN` fixture used by the player/offer tests and removes
  // it again afterwards. Needs `DATABASE_URL`; the `e2e` script loads `.env.local`.
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // Pin the browser language so next-intl resolves Indonesian (no prefix)
    // instead of redirecting to `/en` based on the host machine's locale.
    locale: "id-ID",
  },
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: process.env.CI !== "true",
    timeout: 120_000,
  },
  // Use the locally installed Chrome instead of Playwright's bundled build. The
  // CI image installs `chromium` explicitly, so `channel` is only set locally.
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.CI ? {} : { channel: "chrome" }),
      },
    },
  ],
});
