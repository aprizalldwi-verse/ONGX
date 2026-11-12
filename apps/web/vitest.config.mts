import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Workspace packages ship TypeScript sources; let Vite transform them.
    server: {
      deps: {
        inline: [/@ongx\//],
      },
    },
  },
});
