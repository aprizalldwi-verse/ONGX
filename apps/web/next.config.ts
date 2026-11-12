import createNextIntlPlugin from "next-intl/plugin";

import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    // Custom document for unmatched routes (app/global-not-found.tsx). Needed because
    // the real <html> shell lives in app/[locale]/layout.tsx, not at app/ root.
    globalNotFound: true,
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
    ],
  },
};

export default withNextIntl(nextConfig);
