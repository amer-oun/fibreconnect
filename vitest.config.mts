import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Business-rule tests only.
 *
 * They run against a throwaway SQLite file created per run, so a test never
 * touches prisma/dev.db and the demo data stays intact.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // Les tests partagent une base SQLite : on les execute en serie.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
});
