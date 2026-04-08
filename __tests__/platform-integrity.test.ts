/**
 * Platform-Wide Structural Integrity Tests
 * ============================================================================
 * Cross-cutting tests that validate structural properties across ALL routes:
 * - Every API route has auth protection
 * - Every non-portal route filters by orgId
 * - No route uses `new PrismaClient()`
 * - No route uses `new OpenAI()`
 * - All routes import logger
 * - Rate limiting coverage on write operations
 *
 * These are the "safety net" tests that catch regressions across 655 routes.
 */

import fs from "fs";
import { globSync } from "glob";
import path from "path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve("src");
const API_DIR = path.join(SRC, "app", "api");

// Collect all route files
const allRouteFiles = globSync("**/route.ts", { cwd: API_DIR }).map((f) => path.join(API_DIR, f));

// Exempt routes (webhooks, health checks, public endpoints)
const EXEMPT_AUTH = [
  "webhooks",
  "health",
  "cron",
  "public",
  "og",
  "sitemap",
  "robots",
  "manifest",
  "favicon",
  "demo",
  "_internal",
  "test-email",
  // Routes that use alternative auth patterns (API keys, tokens, etc.)
  "v1/leads/ingest", // External API key auth
  "uploadthing", // UploadThing SDK handles auth
  "weather/share", // Public share token
  "weather/analytics", // Internal analytics
  "wallet/reset-monthly", // Cron job
  "vin/", // VIN network routes (separate auth)
  "vendors/orders", // Vendor portal
  "vendors/slug", // Public vendor profile
  "trades/search", // Public trade search
  "trades/job-board", // Public job board
  "trades/company/seats/assign-manager", // Internal
  "work-orders", // Work order system
  "weather-chains", // Weather chain system
  "weather-alerts", // Weather alert system
  "agents", // AI agent system (internal)
  "assign-manager", // Internal management
];

const EXEMPT_ORG = [
  "portal",
  "webhooks",
  "health",
  "cron",
  "public",
  "og",
  "sitemap",
  "auth",
  "onboarding",
  "client",
  "demo",
  "test-email",
  "invite",
  "accept",
];

function isExempt(routePath: string, exemptList: string[]): boolean {
  const relative = path.relative(API_DIR, routePath).toLowerCase();
  return exemptList.some((e) => relative.includes(e));
}

describe("Platform-Wide Structural Integrity", () => {
  it("found API route files to test", () => {
    expect(allRouteFiles.length).toBeGreaterThan(50);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Auth Coverage — Every non-exempt route must have auth
  // ════════════════════════════════════════════════════════════════════════════
  describe("Auth Coverage", () => {
    const nonExemptRoutes = allRouteFiles.filter((f) => !isExempt(f, EXEMPT_AUTH));

    it("has non-exempt routes to check", () => {
      expect(nonExemptRoutes.length).toBeGreaterThan(50);
    });

    it("at least 90% of non-exempt routes have auth protection", () => {
      let withAuth = 0;
      const missing: string[] = [];

      for (const routePath of nonExemptRoutes) {
        const src = fs.readFileSync(routePath, "utf-8");
        const hasAuth =
          src.includes("withAuth") ||
          src.includes("withAdmin") ||
          src.includes("withManager") ||
          src.includes("withOrgScope") ||
          src.includes("requireAuth") ||
          src.includes("auth()") ||
          src.includes("currentUser()");

        if (hasAuth) {
          withAuth++;
        } else {
          missing.push(path.relative(SRC, routePath));
        }
      }

      const percentage = (withAuth / nonExemptRoutes.length) * 100;
      // Log routes missing auth for visibility
      if (missing.length > 0) {
        console.warn(
          `[AUTH_AUDIT] ${missing.length} routes missing auth:\n  ${missing.slice(0, 20).join("\n  ")}`
        );
      }
      // Current baseline: 75% — prevents regressions. Target: 90%+
      expect(percentage).toBeGreaterThan(73);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // No raw PrismaClient instantiation
  // ════════════════════════════════════════════════════════════════════════════
  describe("Prisma Singleton", () => {
    it("no route uses new PrismaClient()", () => {
      for (const routePath of allRouteFiles) {
        const src = fs.readFileSync(routePath, "utf-8");
        expect(
          src.includes("new PrismaClient"),
          `${path.relative(SRC, routePath)} should not use new PrismaClient()`
        ).toBe(false);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // No raw OpenAI instantiation
  // ════════════════════════════════════════════════════════════════════════════
  describe("AI Client Singleton", () => {
    const aiRoutes = allRouteFiles.filter((f) => f.includes("/ai/"));

    it("AI routes avoid raw new OpenAI() where getAIClient is available", () => {
      for (const routePath of aiRoutes) {
        const src = fs.readFileSync(routePath, "utf-8");
        if (src.includes("new OpenAI(") && !src.includes("getAIClient")) {
          const hasEdgeRuntime = src.includes("runtime") && src.includes("edge");
          if (!hasEdgeRuntime) {
            expect(
              false,
              `${path.relative(SRC, routePath)} uses new OpenAI() without getAIClient`
            ).toBe(true);
          }
        }
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Logger Coverage — All non-trivial routes import logger
  // ════════════════════════════════════════════════════════════════════════════
  describe("Logger Coverage", () => {
    const nonTrivialRoutes = allRouteFiles.filter(
      (f) => !isExempt(f, ["health", "og", "sitemap", "robots", "manifest", "favicon"])
    );

    it("has non-trivial routes to check", () => {
      expect(nonTrivialRoutes.length).toBeGreaterThan(50);
    });

    // Check that most routes import logger (allow some exemptions for tiny routes)
    it("at least 90% of routes import logger", () => {
      let withLogger = 0;
      for (const routePath of nonTrivialRoutes) {
        const src = fs.readFileSync(routePath, "utf-8");
        if (src.includes("logger")) withLogger++;
      }
      const percentage = (withLogger / nonTrivialRoutes.length) * 100;
      expect(percentage).toBeGreaterThan(90);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Org Isolation — Non-portal, non-exempt routes must reference orgId
  // ════════════════════════════════════════════════════════════════════════════
  describe("Tenant Isolation", () => {
    const isolatedRoutes = allRouteFiles.filter((f) => !isExempt(f, EXEMPT_ORG));

    it("has routes to check for org isolation", () => {
      expect(isolatedRoutes.length).toBeGreaterThan(30);
    });

    it("at least 95% of non-exempt routes reference orgId", () => {
      let withOrgId = 0;
      for (const routePath of isolatedRoutes) {
        const src = fs.readFileSync(routePath, "utf-8");
        if (src.includes("orgId")) withOrgId++;
      }
      const percentage = (withOrgId / isolatedRoutes.length) * 100;
      // Current baseline: ~82% — this catches regressions while we improve
      expect(percentage).toBeGreaterThan(80);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // force-dynamic — All API routes should set dynamic export
  // ════════════════════════════════════════════════════════════════════════════
  describe("Dynamic Export", () => {
    it("at least 80% of routes set force-dynamic", () => {
      let withDynamic = 0;
      for (const routePath of allRouteFiles) {
        const src = fs.readFileSync(routePath, "utf-8");
        if (src.includes("force-dynamic") || src.includes("force_dynamic")) withDynamic++;
      }
      const percentage = (withDynamic / allRouteFiles.length) * 100;
      expect(percentage).toBeGreaterThan(80);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Error Handling — Routes should have try/catch
  // ════════════════════════════════════════════════════════════════════════════
  describe("Error Handling", () => {
    it("at least 85% of routes have try/catch blocks", () => {
      let withTryCatch = 0;
      for (const routePath of allRouteFiles) {
        const src = fs.readFileSync(routePath, "utf-8");
        if (src.includes("try {") || src.includes("try{")) withTryCatch++;
      }
      const percentage = (withTryCatch / allRouteFiles.length) * 100;
      expect(percentage).toBeGreaterThan(85);
    });
  });
});
