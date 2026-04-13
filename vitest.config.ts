import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Fix ESM resolution for next/server — vitest ESM can't resolve without .js extension
      "next/server": path.resolve(__dirname, "node_modules/next/dist/server/web/exports/index.js"),
    },
    // Tell vitest to try 'require' condition (where next/server is defined as CJS)
    conditions: ["node", "import", "require"],
  },
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts", "tests/**/*.test.ts", "src/**/__tests__/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/e2e/**", "**/*.spec.ts"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/app/api/**", "src/lib/**"],
      thresholds: {
        statements: 5,
        branches: 5,
        functions: 5,
        lines: 5,
      },
    },
  },
});
