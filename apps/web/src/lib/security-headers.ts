/**
 * Production security headers. Kept pure so the exact CSP can be unit tested
 * and reviewed without starting Next. `next.config.ts` calls these for every
 * route; `docs/security.md` explains the trade-offs.
 */

export interface SecurityHeader {
  key: string;
  value: string;
}

export interface SecurityHeaderOptions {
  /** Enables HSTS and drops development-only CSP allowances. */
  production: boolean;
  /** Account-specific ad bridge loaded by `<Script>`; its origin may run code. */
  adapterUrl?: string | undefined;
  /** Extra space/comma separated origins allowed to load scripts (ads, embeds). */
  extraOrigins?: string | undefined;
}

function httpOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Parses `CSP_EXTRA_ORIGINS`, ignoring anything that is not an http(s) origin. */
export function parseExtraOrigins(value: string | undefined): string[] {
  if (!value) return [];

  const origins = new Set<string>();
  for (const candidate of value.split(/[\s,]+/)) {
    if (candidate.length === 0) continue;
    const origin = httpOrigin(candidate);
    if (origin) origins.add(origin);
  }

  return [...origins];
}

/**
 * Pragmatic CSP for a static/ISR Next app. Next inlines its bootstrap scripts,
 * so a nonce would force every public page to render dynamically; `'unsafe-inline'`
 * is the trade-off. `script-src-attr 'none'` still rejects inline event
 * handlers, and the ad adapter origin is the only extra script source by default.
 */
export function buildCsp(options: SecurityHeaderOptions): string {
  const scriptSources = ["'self'", "'unsafe-inline'"];
  if (!options.production) scriptSources.push("'unsafe-eval'");

  const adapter = options.adapterUrl ? httpOrigin(options.adapterUrl) : null;
  if (adapter) scriptSources.push(adapter);
  scriptSources.push(...parseExtraOrigins(options.extraOrigins));

  const directives: Array<[string, readonly string[]]> = [
    ["default-src", ["'self'"]],
    ["base-uri", ["'self'"]],
    ["object-src", ["'none'"]],
    ["frame-ancestors", ["'none'"]],
    ["form-action", ["'self'"]],
    ["script-src", [...new Set(scriptSources)]],
    ["script-src-attr", ["'none'"]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["font-src", ["'self'", "data:"]],
    // HLS segments and the video element's blob URL.
    ["media-src", ["'self'", "blob:", "https:"]],
    // Search API, HLS manifests/segments and provider embeds all use https.
    ["connect-src", ["'self'", "https:"]],
    ["frame-src", ["'self'", "https:"]],
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
  ];

  return directives
    .map(([name, values]) => (values.length > 0 ? `${name} ${values.join(" ")}` : name))
    .join("; ");
}

export function securityHeaders(options: SecurityHeaderOptions): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: "Content-Security-Policy", value: buildCsp(options) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
    // Ads open a popunder; `allow-popups` keeps that working while still
    // isolating our browsing context from cross-origin documents.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
  ];

  if (options.production) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}
