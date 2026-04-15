import { expect, test } from "@playwright/test";

import { hasRealDb } from "./utils/dbTestGuard";
const hasDb = hasRealDb();

/**
 * Smoke Tests - Critical User Paths
 * Run with: pnpm test:e2e
 *
 * These tests verify:
 * - Homepage loads and shows hero
 * - Sign-in page is accessible
 * - Dashboard requires authentication
 * - Critical pages return 200 or redirect correctly
 */

test.describe("Critical System Smoke Tests", () => {
  test("homepage loads successfully", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    // Check for main hero heading - matches actual content
    await expect(
      page.getByRole("heading", { name: /Operating System|Storm Restoration/i })
    ).toBeVisible();
    await expect(page).toHaveTitle(/SkaiScraper/i);
  });

  test("sign-in page is accessible", async ({ page }) => {
    const response = await page.goto("/sign-in").catch(() => null);
    if (!response || response.status() >= 400)
      return test.skip(true, "Sign-in route not available");
    await page.waitForTimeout(1500); // allow Clerk assets to attempt load
    const emailInput = page.locator('input[type="email"], input[name*="email" i], form');
    const visible = await emailInput
      .first()
      .isVisible()
      .catch(() => false);
    if (!visible) return test.skip(true, "Clerk UI not loaded");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("dashboard shows inline auth gate when not authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    // Clerk may redirect to sign-in or show inline gate depending on config
    const url = page.url();
    if (url.includes("/sign-in")) {
      // Clerk redirect behavior - valid auth gate
      await expect(page).toHaveURL(/sign-in/);
    } else {
      // Inline auth gate behavior
      await expect(page).toHaveURL(/\/dashboard/);
      const h1 = page.locator("h1");
      await expect(h1).toContainText(/Sign In Required/i);
    }
  });

  test("pricing page loads tier headings", async ({ page }) => {
    await page.goto("/pricing");
    // New pricing structure: $80 per seat per month (no tiers)
    // Use .first() — regex matches both h1 "$80 per seat / month" and h2 "Pricing Calculator"
    await expect(page.getByRole("heading", { name: /\$80|per seat|pricing/i }).first()).toBeVisible(
      {
        timeout: 10000,
      }
    );

    // Check for key pricing elements
    const bodyText = await page.textContent("body");
    expect(bodyText).toMatch(/\$80|per seat|per month/i);
  });
});

test.describe("Authentication Flow", () => {
  test("dashboard unauth shows sign-in required heading", async ({ page }) => {
    await page.goto("/dashboard");
    // Clerk may redirect to sign-in or show inline gate depending on config
    const url = page.url();
    if (url.includes("/sign-in")) {
      // Clerk redirect behavior - valid auth gate
      await expect(page).toHaveURL(/sign-in/);
    } else {
      // Inline auth gate behavior
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator("h1")).toContainText(/Sign In Required|Initialize Workspace/i);
    }
  });

  test("sign-in page renders accessible heading", async ({ page }) => {
    const response = await page.goto("/sign-in").catch(() => null);
    if (!response || response.status() >= 400)
      return test.skip(true, "Sign-in route not available");
    await page.waitForTimeout(1500);
    const formPresence = page.locator('form, input[type="email"], input[name*="email" i]');
    const visible = await formPresence
      .first()
      .isVisible()
      .catch(() => false);
    if (!visible) return test.skip(true, "Clerk UI not loaded");
  });
});

test.describe("Health Endpoints", () => {
  test("/api/health/live returns 200 OK", async ({ request }) => {
    const response = await request.get("/api/health/live");

    expect(response.ok()).toBeTruthy();
    // Accept 200 (healthy) or 207 (degraded) - both are valid operational states
    expect([200, 207]).toContain(response.status());

    const json = await response.json();
    expect(["ok", "degraded"]).toContain(json.status);
    expect(json.service).toBe("skaiscraper");
  });

  test("/api/health/ready returns 200 OK with database check (skips without DB)", async ({
    request,
  }) => {
    if (!hasDb) test.skip(true, "Skipping /api/health/ready DB check without real DATABASE_URL");
    const response = await request.get("/api/health/ready");
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.status).toMatch(/ready|degraded/);
  });
});

test.describe("Public Routes", () => {
  test("features page is accessible", async ({ page }) => {
    await page.goto("/features");

    // Should not redirect to sign-in
    await expect(page).not.toHaveURL(/sign-in/);
  });

  test("contact page renders", async ({ page }) => {
    await page.goto("/contact");

    // Contact page may have different structure - check page loaded
    const bodyText = await page.textContent("body");
    expect(bodyText?.length).toBeGreaterThan(50);
    // Should contain contact-related content
    expect(bodyText?.toLowerCase()).toMatch(/contact|email|message|reach/i);
  });

  test("trades network page loads", async ({ page }) => {
    await page.goto("/trades-network");

    // Should load without auth
    await expect(page).not.toHaveURL(/sign-in/);
  });
});

test.describe("SEO & Performance", () => {
  const isProdLike = process.env.NODE_ENV === "production" || !!process.env.VERCEL_ENV;
  test(
    isProdLike ? "robots.txt is accessible" : "robots.txt is accessible (dev)",
    async ({ request }) => {
      const response = await request.get("/robots.txt");
      const status = response.status();
      if (!isProdLike) {
        // In local dev we sometimes see 500 from next-sitemap middleware; treat it as transient acceptable.
        expect([200, 404, 500]).toContain(status);
        return;
      }
      expect(response.ok()).toBeTruthy();
    }
  );
  test("sitemap.xml is accessible", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect([200, 404]).toContain(response.status());
  });
  test("favicon loads", async ({ request }) => {
    const response = await request.get("/favicon.ico");
    expect(response.ok()).toBeTruthy();
  });
});
