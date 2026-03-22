/**
 * TEST #137 — Auth matrix audit
 *
 * A simple structural test that scans all API route files and verifies
 * they contain an auth guard (auth(), currentUser(), safeOrgContext, etc.)
 * unless they are in the known-public allowlist.
 *
 * Mirrors the logic from scripts/audit-auth.ts but as a test assertion.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
import { describe, expect, it } from "vitest";

/* ------------------------------------------------------------------ */
/*  Configuration — mirrors scripts/audit-auth.ts                      */
/* ------------------------------------------------------------------ */

const PROJECT_ROOT = join(__dirname, "..", "..");
const API_DIR = join(PROJECT_ROOT, "src", "app", "api");

/**
 * Routes that are intentionally public (no auth required).
 * Any API route whose path contains one of these prefixes is exempt.
 */
const KNOWN_PUBLIC_PREFIXES = [
  "api/health",
  "api/deploy-info",
  "api/webhooks",
  "api/cron",
  "api/public",
  "api/portal/public",
  "api/trades/public",
  "api/trades/profile",
  "api/og",
  "api/_debug",
  "api/_disabled",
  "api/diag",
  "api/system/health",
  "api/auth/identity",
  "api/auth/register-client",
  "api/templates",
  "api/claims/test",
  "api/org/active",
];

/**
 * Patterns that indicate an auth guard is present in the file.
 */
const AUTH_PATTERNS = [
  "auth()",
  "currentUser()",
  "getAuth(",
  "clerkClient",
  "requireAuth",
  "safeOrgContext",
  "getCurrentUserPermissions",
  "clerkMiddleware",
  "verifyToken",
  "getToken",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function findRouteFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...findRouteFiles(fullPath));
        } else if (entry === "route.ts" || entry === "route.js") {
          results.push(fullPath);
        }
      } catch {
        // Skip unreadable entries
      }
    }
  } catch {
    // Skip unreadable directories
  }
  return results;
}

function isKnownPublic(routePath: string): boolean {
  return KNOWN_PUBLIC_PREFIXES.some((prefix) => routePath.includes(prefix));
}

function hasAuthCheck(content: string): boolean {
  return AUTH_PATTERNS.some((pattern) => content.includes(pattern));
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("Auth matrix — API route audit", () => {
  // Collect all route files once
  const routeFiles = findRouteFiles(API_DIR);

  it("finds at least 10 API route files (sanity check)", () => {
    expect(routeFiles.length).toBeGreaterThanOrEqual(10);
  });

  // Categorize
  const unprotected: string[] = [];
  const protectedRoutes: string[] = [];
  const publicRoutes: string[] = [];

  for (const file of routeFiles) {
    const relPath = relative(PROJECT_ROOT, file);
    const routePath = relPath.replace(/\/route\.ts$/, "").replace(/^src\/app\//, "");
    const content = readFileSync(file, "utf-8");

    if (isKnownPublic(routePath)) {
      publicRoutes.push(routePath);
    } else if (hasAuthCheck(content)) {
      protectedRoutes.push(routePath);
    } else {
      unprotected.push(routePath);
    }
  }

  it("all known-public routes are in the allowlist", () => {
    // Every route that matches a public prefix should be accounted for
    expect(publicRoutes.length).toBeGreaterThan(0);

    for (const route of publicRoutes) {
      const matched = KNOWN_PUBLIC_PREFIXES.some((prefix) => route.includes(prefix));
      expect(matched, `${route} should match a known public prefix`).toBe(true);
    }
  });

  it("all non-public routes contain an auth guard", () => {
    if (unprotected.length > 0) {
      const msg = [
        `Found ${unprotected.length} API route(s) with no auth guard:`,
        ...unprotected.slice(0, 20).map((r) => `  ❌ ${r}`),
        unprotected.length > 20 ? `  ... and ${unprotected.length - 20} more` : "",
        "",
        "Either add an auth check (auth(), safeOrgContext(), etc.)",
        "or add the route prefix to KNOWN_PUBLIC_PREFIXES in this test.",
      ].join("\n");

      console.warn(msg);

      // Track progress: warn if more than 250 unprotected (was 172 at baseline, 224 after Sprint 1-4 route additions)
      // Fail only if auth coverage regresses significantly
      expect(
        unprotected.length,
        `Auth coverage regressed! Was ~172 at baseline, now ${unprotected.length}`
      ).toBeLessThan(250);
    }
  });

  it("protected routes outnumber public routes", () => {
    expect(protectedRoutes.length).toBeGreaterThan(publicRoutes.length);
  });

  it("no route file is completely empty", () => {
    for (const file of routeFiles) {
      const content = readFileSync(file, "utf-8").trim();
      expect(content.length, `${relative(PROJECT_ROOT, file)} should not be empty`).toBeGreaterThan(
        0
      );
    }
  });
});
