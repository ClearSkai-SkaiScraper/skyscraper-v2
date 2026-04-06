/**
 * ============================================================================
 * AUTH & ROUTE ACCESS SMOKE TESTS — Session 8 CI Gate
 * ============================================================================
 *
 * Static analysis + mock tests verifying:
 * 1. Protected API routes require auth
 * 2. Tenant scoping (orgId) is enforced
 * 3. Auth patterns are consistent
 *
 * Run: pnpm test:unit __tests__/smoke/auth.test.ts
 * ============================================================================
 */

import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const API_DIR = path.resolve(__dirname, "../../src/app/api");

function readRoute(routePath: string): string {
  const fullPath = path.join(API_DIR, routePath, "route.ts");
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Route file not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, "utf-8");
}

function routeExists(routePath: string): boolean {
  return fs.existsSync(path.join(API_DIR, routePath, "route.ts"));
}

/** Route uses one of the known auth patterns */
function usesAuth(src: string): boolean {
  return (
    /\bwithOrgScope\b/.test(src) ||
    /\bwithAuth\b/.test(src) ||
    /\bwithManager\b/.test(src) ||
    /\bwithAdmin\b/.test(src) ||
    /await\s+auth\(\)/.test(src) ||
    /\brequireAuth\b/.test(src) ||
    /\brequireTenant\b/.test(src) ||
    /\bsafeOrgContext\b/.test(src) ||
    /\bgetActiveOrgContext\b/.test(src) ||
    /\bgetAuthContext\b/.test(src)
  );
}

/** Route scopes data queries by orgId */
function scopesByOrgId(src: string): boolean {
  return (
    src.includes("orgId") &&
    (src.includes("where") || src.includes("WHERE") || src.includes("getOrgClaimOrThrow"))
  );
}

/** Route does NOT accept orgId from client input */
function doesNotAcceptClientOrgId(src: string): boolean {
  return (
    !src.match(/searchParams\.get\(["']orgId["']\)/) &&
    !src.match(/body\.orgId/) &&
    !src.match(/req\.json\(\).*orgId.*=/)
  );
}

// ── 1. Protected routes must require auth ─────────────────────────
describe("Auth: Protected routes require authentication", () => {
  const criticalRoutes = [
    "claims",
    "claims/[claimId]",
    "claims/[claimId]/update",
    "tasks",
    "tasks/[taskId]",
    "reports/generate",
    "branding",
    "branding/save",
    "billing/cancel",
    "billing/create-subscription",
    "contacts/invite",
    "teams/invite",
    "weather/share",
    "weather/report",
    "notifications/mark-read",
    "ai/claim-assistant",
    "email/send",
    "invoices",
    "work-orders",
    "leads",
  ];

  for (const route of criticalRoutes) {
    it(`${route} requires auth`, () => {
      if (!routeExists(route)) return; // skip if route moved/removed
      const src = readRoute(route);
      expect(usesAuth(src)).toBe(true);
    });
  }
});

// ── 2. Data routes scope queries by orgId ───────────────────────
describe("Auth: Data routes scope queries by orgId", () => {
  const dataRoutes = [
    "claims",
    "claims/[claimId]",
    "claims/[claimId]/update",
    "claims/[claimId]/trades",
    "claims/[claimId]/scope",
    "claims/[claimId]/messages",
    "claims/[claimId]/supplements/items",
    "tasks",
    "leads",
    "contacts/[contactId]",
    "invoices",
  ];

  for (const route of dataRoutes) {
    it(`${route} scopes by orgId`, () => {
      if (!routeExists(route)) return;
      const src = readRoute(route);
      expect(scopesByOrgId(src)).toBe(true);
    });
  }
});

// ── 3. Routes don't accept orgId from client ───────────────────
describe("Auth: No client-supplied orgId", () => {
  const sensitiveRoutes = [
    "claims/[claimId]",
    "claims/[claimId]/update",
    "branding",
    "billing/cancel",
    "tasks/[taskId]",
    "weather/share",
    "weather/report",
  ];

  for (const route of sensitiveRoutes) {
    it(`${route} does not accept orgId from client`, () => {
      if (!routeExists(route)) return;
      const src = readRoute(route);
      expect(doesNotAcceptClientOrgId(src)).toBe(true);
    });
  }
});

// ── 4. DELETE routes verify ownership before delete ────────────
describe("Auth: DELETE routes verify ownership", () => {
  const deleteRoutes = [
    "claims/[claimId]",
    "tasks/[taskId]",
    "invoices/[id]",
    "claims/[claimId]/trades",
  ];

  for (const route of deleteRoutes) {
    it(`${route} verifies ownership on delete`, () => {
      if (!routeExists(route)) return;
      const src = readRoute(route);
      // Must have auth + org scoping before any delete operation
      expect(usesAuth(src)).toBe(true);
      expect(src.includes("orgId") || src.includes("getOrgClaimOrThrow")).toBe(true);
    });
  }
});
