import { describe, expect, it } from "vitest";

import { buildCsp, parseExtraOrigins, securityHeaders } from "./security-headers";

describe("buildCsp", () => {
  it("locks the document down and allows eval only in development", () => {
    const dev = buildCsp({ production: false });
    expect(dev).toContain("default-src 'self'");
    expect(dev).toContain("frame-ancestors 'none'");
    expect(dev).toContain("object-src 'none'");
    expect(dev).toContain("base-uri 'self'");
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain("script-src-attr 'none'");

    const prod = buildCsp({ production: true });
    expect(prod).not.toContain("'unsafe-eval'");
    expect(prod).toContain("'unsafe-inline'");
  });

  it("allows the HLS blob worker and video element", () => {
    const csp = buildCsp({ production: true });
    expect(csp).toContain("media-src 'self' blob: https:");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("connect-src 'self' https:");
  });

  it("adds the ad adapter origin to script-src", () => {
    const csp = buildCsp({
      production: true,
      adapterUrl: "https://ads.example.com/tag.js",
    });

    expect(csp).toContain("https://ads.example.com");
  });

  it("ignores non-http(s) adapter and extra origins", () => {
    const csp = buildCsp({
      production: true,
      adapterUrl: "javascript:alert(1)",
      extraOrigins: "data:text/html,x ftp://files.example.com https://cdn.example.com",
    });

    expect(csp).not.toContain("javascript:");
    expect(csp).not.toContain("data:text/html");
    expect(csp).not.toContain("ftp:");
    expect(csp).toContain("https://cdn.example.com");
  });

  it("deduplicates repeated origins", () => {
    const csp = buildCsp({
      production: true,
      adapterUrl: "https://ads.example.com/tag.js",
      extraOrigins: "https://ads.example.com https://ads.example.com",
    });

    expect(csp.match(/https:\/\/ads\.example\.com/g)).toHaveLength(1);
  });
});

describe("parseExtraOrigins", () => {
  it("accepts space or comma separated http(s) origins", () => {
    expect(
      parseExtraOrigins("https://a.example.com, https://b.example.com:8443 http://c.example.com"),
    ).toEqual(["https://a.example.com", "https://b.example.com:8443", "http://c.example.com"]);
  });

  it("returns an empty list for missing or invalid input", () => {
    expect(parseExtraOrigins(undefined)).toEqual([]);
    expect(parseExtraOrigins("  ")).toEqual([]);
    expect(parseExtraOrigins("javascript:alert(1)")).toEqual([]);
  });
});

describe("securityHeaders", () => {
  it("always sends baseline protections", () => {
    const headers = new Map(
      securityHeaders({ production: false }).map(({ key, value }) => [key, value]),
    );

    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");
  });

  it("only sends HSTS in production", () => {
    const dev = securityHeaders({ production: false });
    expect(dev.some(({ key }) => key === "Strict-Transport-Security")).toBe(false);

    const prod = new Map(
      securityHeaders({ production: true }).map(({ key, value }) => [key, value]),
    );
    expect(prod.get("Strict-Transport-Security")).toContain("max-age=63072000");
  });
});
