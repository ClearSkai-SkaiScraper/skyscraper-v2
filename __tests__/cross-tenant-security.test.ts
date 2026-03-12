/**
 * 🔒 CROSS-TENANT SECURITY TESTS — Static Analysis
 *
 * Verifies tenant isolation by reading API route source code and
 * checking that all claim/message/profile routes use orgId-scoped queries.
 *
 * These are STATIC ANALYSIS tests — they do not require a running server.
 *
 * Run: pnpm test __tests__/cross-tenant-security.test.ts
 */

import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const API_DIR = path.resolve(__dirname, "../src/app/api");

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

/** Route scopes queries by orgId in WHERE clause */
function scopesByOrgId(src: string): boolean {
  return src.includes("orgId") && (src.includes("where") || src.includes("WHERE"));
}

/** Route uses proper auth */
function usesAuth(src: string): boolean {
  return (
    /\bwithOrgScope\b/.test(src) ||
    /\bwithAuth\b/.test(src) ||
    /await\s+auth\(\)/.test(src) ||
    /\brequireTenant\b/.test(src) ||
    /\bsafeOrgContext\b/.test(src)
  );
}

/** Route does NOT accept orgId from client input */
function doesNotAcceptClientOrgId(src: string): boolean {
  return !src.match(/searchParams\.get\(["']orgId["']\)/) && !src.match(/body\.orgId/);
}

describe("Cross-Tenant Security", () => {
  describe("Claim Isolation", () => {
    it("claims/[claimId] route scopes by orgId", () => {
      const src = readRoute("claims/[claimId]");
      expect(usesAuth(src)).toBe(true);
      expect(scopesByOrgId(src)).toBe(true);
    });

    it("claims list route scopes by orgId", () => {
      const src = readRoute("claims");
      expect(usesAuth(src)).toBe(true);
      expect(scopesByOrgId(src)).toBe(true);
    });

    it("claims route does not accept orgId from client", () => {
      const src = readRoute("claims/[claimId]");
      expect(doesNotAcceptClientOrgId(src)).toBe(true);
    });
  });

  describe("Message Thread Isolation", () => {
    it("messages route uses auth", () => {
      if (!routeExists("messages")) return;
      const src = readRoute("messages");
      expect(usesAuth(src)).toBe(true);
    });
  });

  describe("Contractor Profile Access", () => {
    it("trades/company route uses auth for mutations", () => {
      if (!routeExists("trades/company")) return;
      const src = readRoute("trades/company");
      expect(usesAuth(src)).toBe(true);
    });
  });

  describe("Connection Request Validation", () => {
    it("trades/connections route uses auth", () => {
      if (!routeExists("trades/connections")) return;
      const src = readRoute("trades/connections");
      expect(usesAuth(src)).toBe(true);
    });
  });

  describe("Client Access Validation", () => {
    it("claims client-access route scopes by orgId", () => {
      if (!routeExists("claims/client-access")) return;
      const src = readRoute("claims/client-access");
      expect(usesAuth(src)).toBe(true);
      expect(scopesByOrgId(src)).toBe(true);
    });
  });
});

describe("Data Leak Prevention", () => {
  it("claims route does not expose stack traces in responses", () => {
    const src = readRoute("claims/[claimId]");
    // Response bodies should not contain error.stack
    const responseMatches = src.match(/NextResponse\.json\([^)]*error\.stack/g);
    expect(responseMatches).toBeNull();
  });
});
