import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Live smoke checks (network required, real TMDB key). Kept out of the default
 * `pnpm test` glob so CI never makes live calls.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["scripts/**/*.smoke.ts"],
    testTimeout: 60_000,
    server: {
      deps: {
        inline: [/@ongx\//],
      },
    },
  },
});
