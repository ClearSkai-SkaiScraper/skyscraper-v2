import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 * https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests",

  // Only match .spec.ts files, exclude .test.ts (Vitest unit tests)
  testMatch: /.*\.spec\.ts$/,
  testIgnore: [/.*\.test\.ts$/, "**/node_modules/**"],

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Workers
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: "html",

  // Shared settings for all tests
  use: {
    // Base URL from env or localhost
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

    // Collect trace when retrying
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",
  },

  // Configure projects for different browsers and test directories
  // Default test timeout: 45s to accommodate first-hit route compilation in dev mode.
  // Individual test.describe blocks can override with test.describe.configure().
  timeout: 45_000,

  projects: [
    {
      name: "smoke",
      testDir: "./tests",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "e2e",
      testDir: "./e2e",
      use: { ...devices["Desktop Chrome"] },
    },
    // Optionally test Firefox and Safari
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run dev server before tests (optional, comment out if testing deployed URL)
  webServer: {
    // Use valid UUID for org id to avoid Postgres uuid parse errors in tests
    command:
      "TEST_AUTH_BYPASS=1 TEST_AUTH_USER_ID=test-user-1 TEST_AUTH_ORG_ID=11111111-1111-1111-1111-111111111111 PORT=3000 pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // allow build/start latency
  },
  globalSetup: "./tests/globalSetup.ts",
});
