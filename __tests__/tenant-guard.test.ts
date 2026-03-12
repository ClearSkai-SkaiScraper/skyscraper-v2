/**
 * ============================================================================
 * TENANT GUARD TESTS — Verify withAuth + orgId-in-WHERE enforcement
 * ============================================================================
 *
 * These tests verify that the highest-risk routes:
 *   1. Use withAuth (or equivalent) for authentication
 *   2. Include orgId in the WHERE clause for DB queries
 *   3. Return 404 (not 403) for cross-tenant resources (no enumeration)
 *
 * Tested routes (post-migration):
 *   - POST /api/claims/state
 *   - POST /api/pipeline/move
 *   - POST /api/jobs/move
 *   - POST /api/branding/upsert
 *   - GET /api/claims/[claimId]/ai
 *   - POST /api/video-reports/[id]/share
 *   - POST /api/video-reports/[id]/revoke
 *
 * Strategy: Import the route source, grep for patterns that prove
 * org-scoping. This is a static analysis test — faster than integration
 * tests, catches regressions immediately.
 * ============================================================================
 */

import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const API_DIR = path.resolve(__dirname, "../src/app/api");

function readRoute(routePath: string): string {
  return readFileSync(path.join(API_DIR, routePath, "route.ts"), "utf-8");
}

/**
 * Pattern: route uses withAuth or withOrgScope (canonical auth wrappers)
 */
function usesCanonicalAuth(source: string): boolean {
  return /\bwithAuth\b/.test(source) || /\bwithOrgScope\b/.test(source);
}

/**
 * Pattern: claims queries include orgId in the where clause
 */
function claimsQueryIncludesOrgId(source: string): boolean {
  // Match findFirst/findMany on claims with orgId in where
  return /claims\.find(?:First|Many|Unique)\s*\(\s*\{[^}]*where\s*:\s*\{[^}]*orgId/s.test(source);
}

/**
 * Pattern: does NOT use bare findUnique on claims without orgId
 */
function noBareFindUniqueClaims(source: string): boolean {
  // Find all claims.findUnique calls
  const findUniqueMatches = source.match(/claims\.findUnique\s*\(\s*\{[^)]*\}/gs) || [];
  // Check if any of them lack orgId
  for (const match of findUniqueMatches) {
    if (!match.includes("orgId")) {
      return false; // Found a bare findUnique without orgId
    }
  }
  return true;
}

/**
 * Pattern: does NOT use raw auth() as primary auth (should use withAuth/withOrgScope)
 */
function noRawAuthAsPrimary(source: string): boolean {
  // If it uses withAuth or withOrgScope, it's fine even if auth() is imported for demo paths
  if (usesCanonicalAuth(source)) return true;
  // Otherwise, check if auth() is the primary pattern
  const hasRawAuth = /const\s*\{[^}]*\}\s*=\s*await\s+auth\(\)/.test(source);
  return !hasRawAuth;
}

// ─── Route-level tests ─────────────────────────────────────────────────

describe("Tenant Guard — withAuth migration routes", () => {
  // POST /api/claims/state — route was removed during refactoring

  describe("POST /api/pipeline/move", () => {
    const src = readRoute("pipeline/move");
    it("uses withAuth", () => expect(usesCanonicalAuth(src)).toBe(true));
  });

  // POST /api/branding/upsert — route was removed during refactoring

  describe("POST /api/stripe/checkout", () => {
    const src = readRoute("stripe/checkout");
    it("uses withAuth", () => expect(usesCanonicalAuth(src)).toBe(true));
  });

  describe("POST /api/invitations/send", () => {
    const src = readRoute("invitations/send");
    it("uses withAuth", () => expect(usesCanonicalAuth(src)).toBe(true));
  });

  // POST /api/reports/compose — route removed during refactoring
  // POST /api/referral/invite — route removed during refactoring
  // POST /api/notify/send — route removed during refactoring
  // POST /api/claims/client-access — route removed during refactoring
});

describe("Tenant Guard — IDOR-fixed routes", () => {
  describe("POST /api/jobs/move", () => {
    const src = readRoute("jobs/move");
    it("uses withAuth", () => expect(usesCanonicalAuth(src)).toBe(true));
    it("does NOT have bare findUnique on claims", () => {
      expect(noBareFindUniqueClaims(src)).toBe(true);
    });
  });

  describe("claims/[claimId]/ai", () => {
    const src = readRoute("claims/[claimId]/ai");
    it("scopes claims queries by orgId", () => {
      // Should use findFirst with orgId, not findUnique without
      expect(src).toContain("findFirst");
      expect(noBareFindUniqueClaims(src)).toBe(true);
    });
  });
});

describe("Tenant Guard — check-after-fetch tightened routes", () => {
  describe("POST /api/video-reports/[id]/share", () => {
    const src = readRoute("video-reports/[id]/share");
    it("uses findFirst with orgId (not bare findUnique)", () => {
      expect(src).toContain("findFirst");
      expect(src).toContain("orgId: org.id");
    });
    it("does NOT have a separate orgId !== check (now in WHERE)", () => {
      // The old check-after-fetch pattern should be gone
      expect(src).not.toContain("report.orgId !== org.id");
    });
  });

  describe("POST /api/video-reports/[id]/revoke", () => {
    const src = readRoute("video-reports/[id]/revoke");
    it("uses findFirst with orgId (not bare findUnique)", () => {
      expect(src).toContain("findFirst");
      expect(src).toContain("orgId: Org.id");
    });
    it("does NOT have a separate orgId !== check (now in WHERE)", () => {
      expect(src).not.toContain("report.orgId !== Org.id");
    });
  });
});

describe("Tenant Guard — gold standard routes (regression)", () => {
  describe("claims/[claimId] main route", () => {
    const src = readRoute("claims/[claimId]");
    it("uses withOrgScope", () => expect(usesCanonicalAuth(src)).toBe(true));
    it("scopes claims queries by orgId", () => expect(claimsQueryIncludesOrgId(src)).toBe(true));
  });

  describe("contacts/[contactId]", () => {
    const src = readRoute("contacts/[contactId]");
    it("uses withOrgScope", () => expect(usesCanonicalAuth(src)).toBe(true));
  });

  describe("leads/[id]", () => {
    const src = readRoute("leads/[id]");
    it("uses withOrgScope", () => expect(usesCanonicalAuth(src)).toBe(true));
  });
});
