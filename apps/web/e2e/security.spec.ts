import { expect, test } from "@playwright/test";

/**
 * Wire-level checks for Phase 11. The suite runs against the production server
 * (`pnpm build` then `pnpm start`), so production-only headers such as HSTS are
 * asserted here; `security-headers.test.ts` covers the dev/prod split in isolation.
 */

test("public pages send the hardened header set", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const headers = response.headers();

  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  // The static/ISR trade-off documented in ASUMSI-059.
  expect(headers["content-security-policy"]).toContain("'unsafe-inline'");
  expect(headers["content-security-policy"]).not.toContain("'unsafe-eval'");

  expect(headers["strict-transport-security"]).toContain("max-age=63072000");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin-allow-popups");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("API responses are never cached by the browser or a proxy", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.headers()["cache-control"]).toBe("no-store");
});

test("admin pages are no-store and noindex", async ({ request }) => {
  const response = await request.get("/admin/login");
  expect(response.status()).toBe(200);

  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  expect(await response.text()).toContain('name="robots"');
});

test("report API rejects cross-origin, wrong content type and oversized bodies", async ({
  request,
}) => {
  const validBody = { reason: "broken", message: "security spec" };

  const crossOrigin = await request.post("/api/report", {
    headers: { origin: "https://evil.example" },
    data: validBody,
  });
  expect(crossOrigin.status()).toBe(403);
  expect(crossOrigin.headers()["cache-control"]).toBe("no-store");

  const wrongType = await request.post("/api/report", {
    headers: { "content-type": "text/plain" },
    data: JSON.stringify(validBody),
  });
  expect(wrongType.status()).toBe(415);

  const oversized = await request.post("/api/report", {
    data: { reason: "broken", message: "x".repeat(20 * 1024) },
  });
  expect(oversized.status()).toBe(413);
});
