import createNextIntlPlugin from "next-intl/plugin";

import type { NextConfig } from "next";

import { securityHeaders } from "./src/lib/security-headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const production = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  poweredByHeader: false,
  // Stack traces stay in server logs; the browser only gets the digest.
  productionBrowserSourceMaps: false,
  experimental: {
    // Custom document for unmatched routes (app/global-not-found.tsx). Needed because
    // the real <html> shell lives in app/[locale]/layout.tsx, not at app/ root.
    globalNotFound: true,
    // Admin forms are text-only; cap the action payload below Next's 1 MB default.
    serverActions: { bodySizeLimit: "512kb" },
  },
  async headers() {
    const common = securityHeaders({
      production,
      adapterUrl: process.env.NEXT_PUBLIC_MT_ADAPTER_URL,
      extraOrigins: process.env.CSP_EXTRA_ORIGINS,
    });

    const noStore = { key: "Cache-Control", value: "private, no-store, max-age=0" };
    const noIndex = { key: "X-Robots-Tag", value: "noindex, nofollow" };

    return [
      { source: "/:path*", headers: common },
      // Never let a proxy cache an authenticated panel, and keep admin URLs out
      // of search results even when fetched without the HTML meta tag.
      { source: "/admin/:path*", headers: [noStore, noIndex] },
      { source: "/en/admin/:path*", headers: [noStore, noIndex] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
  // Lint is gated separately by `pnpm lint` (ESLint 9 flat config); Next's legacy
  // plugin detection only understands eslintrc and emits a false warning here.
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ["@ongx/ui", "@ongx/shared", "@ongx/db"],
  serverExternalPackages: ["@prisma/client", "ioredis"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "s4.anilist.co",
        pathname: "/file/anilistcdn/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
