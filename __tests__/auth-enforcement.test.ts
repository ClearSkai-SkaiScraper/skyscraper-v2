/**
 * ============================================================================
 * AUTH ENFORCEMENT — Route Security Verification
 * ============================================================================
 *
 * Static analysis tests that verify critical API routes have proper auth
 * and org-scoping patterns. Guards against regression of IDOR fixes.
 *
 * Categories:
 *   1. DELETE routes must verify org ownership before deleting
 *   2. findUnique must NOT be used with user-supplied IDs (use findFirst + orgId)
 *   3. Destructive endpoints must have rate limiting
 *   4. Auth response patterns — no 403 vs 404 information leakage
 *   5. vin/cart — all handlers must use org-scoped queries
 *
 * ============================================================================
 */

import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../src");

function readRoute(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, "app/api", relativePath), "utf-8");
}

/* ------------------------------------------------------------------ */
/*  1. DELETE routes must verify org ownership                         */
/* ------------------------------------------------------------------ */

describe("DELETE routes — org ownership verification", () => {
  const deleteRoutes = [
    { path: "vin/cart/route.ts", label: "vin/cart" },
    { path: "appointments/[id]/route.ts", label: "appointments/[id]" },
    { path: "work-orders/[id]/route.ts", label: "work-orders/[id]" },
    { path: "materials/estimates/route.ts", label: "materials/estimates" },
    { path: "invoices/[id]/route.ts", label: "invoices/[id]" },
    { path: "estimates/[id]/route.ts", label: "estimates/[id]" },
    { path: "notifications/[id]/route.ts", label: "notifications/[id]" },
  ];

  for (const route of deleteRoutes) {
    it(`${route.label} DELETE has auth check before any delete`, () => {
      const src = readRoute(route.path);

      // Must call one of the known auth functions
      const hasAuth =
        src.includes("safeOrgContext") ||
        src.includes("getActiveOrgContext") ||
        src.includes("getAuthContext") ||
        src.includes("requireAuth") ||
        src.includes("withOrgScope") ||
        src.includes("withAuth") ||
        src.includes("await auth()");

      expect(hasAuth).toBe(true);
    });
  }
});

/* ------------------------------------------------------------------ */
/*  2. vin/cart — org-scoped queries (regression guard for IDOR fix)   */
/* ------------------------------------------------------------------ */

describe("vin/cart — org isolation", () => {
  let src: string;

  // Load once
  it("loads the route file", () => {
    src = readRoute("vin/cart/route.ts");
    expect(src).toBeTruthy();
  });

  it("DELETE verifies cart ownership with orgId before deleting", () => {
    // The DELETE handler must use findFirst with orgId before calling delete
    const deleteSection = src.slice(src.lastIndexOf("async function DELETE"));
    expect(deleteSection).toContain("findFirst");
    expect(deleteSection).toContain("orgId");
  });

  it("DELETE does NOT use bare delete without ownership check", () => {
    const deleteSection = src.slice(src.lastIndexOf("async function DELETE"));
    // Should not have a delete call that isn't preceded by a findFirst
    const lines = deleteSection.split("\n");
    const deleteLines = lines.filter((l) => l.includes(".delete(") && !l.trim().startsWith("//"));
    const findFirstLines = lines.filter(
      (l) => l.includes(".findFirst(") && !l.trim().startsWith("//")
    );
    // Must have at least as many findFirst calls as delete calls (cart + item)
    expect(findFirstLines.length).toBeGreaterThanOrEqual(deleteLines.length);
  });

  it("PUT verifies item ownership with orgId before updating", () => {
    const putSection = src.slice(
      src.indexOf("async function PUT"),
      src.indexOf("async function DELETE")
    );
    expect(putSection).toContain("findFirst");
    expect(putSection).toContain("orgId");
  });

  it("POST add_item verifies cart ownership before adding", () => {
    // The add_item section should check cart ownership
    const addItemSection = src.slice(src.indexOf("add_item"), src.indexOf("submit_cart"));
    expect(addItemSection).toContain("findFirst");
    expect(addItemSection).toContain("orgId");
  });

  it("POST submit_cart uses findFirst with orgId instead of findUnique", () => {
    const submitSection = src.slice(src.indexOf("submit_cart"), src.indexOf("Invalid action"));
    // Must NOT use findUnique (which can't filter by orgId)
    expect(submitSection).not.toContain("findUnique");
    // Must use findFirst with orgId
    expect(submitSection).toContain("findFirst");
    expect(submitSection).toContain("orgId");
  });

  it("does NOT import requireAuth (unified on getActiveOrgContext)", () => {
    expect(src).not.toContain("requireAuth");
  });
});

/* ------------------------------------------------------------------ */
/*  3. appointments — no ?? undefined bypass                           */
/* ------------------------------------------------------------------ */

describe("appointments/[id] — org guard", () => {
  it("does not use 'orgId ?? undefined' pattern", () => {
    const src = readRoute("appointments/[id]/route.ts");
    // This pattern silently drops the org filter when orgId is null
    expect(src).not.toContain("orgId ?? undefined");
    expect(src).not.toContain("orgId: ctx.orgId ?? undefined");
  });

  it("checks orgId is not null before proceeding", () => {
    const src = readRoute("appointments/[id]/route.ts");
    // Must guard against null orgId
    expect(src).toContain("!ctx.orgId");
  });
});

/* ------------------------------------------------------------------ */
/*  4. notifications — no enumeration leakage                         */
/* ------------------------------------------------------------------ */

describe("notifications/[id] — no enumeration", () => {
  it("does not expose Forbidden on invalid notification IDs (uses uniform 404)", () => {
    const src = readRoute("notifications/[id]/route.ts");
    // 403 is ONLY allowed for missing org context (auth failure)
    // but NEVER for "wrong org" — that must use 404 to prevent enumeration
    // Check that "Notification not found" uses 404 (not 403)
    expect(src).toContain('"Notification not found"');
    expect(src).toContain("404");
  });

  it("has mandatory orgId check (returns 403 for missing org)", () => {
    const src = readRoute("notifications/[id]/route.ts");
    // S1-04: orgId is mandatory — 403 for missing org context
    expect(src).toContain('"Organization context required"');
  });

  it("uses findFirst with userId instead of findUnique", () => {
    const src = readRoute("notifications/[id]/route.ts");
    expect(src).toContain("findFirst");
    expect(src).not.toContain("findUnique");
  });
});

/* ------------------------------------------------------------------ */
/*  5. nuclear-reset — rate limiting + confirmation                    */
/* ------------------------------------------------------------------ */

describe("org/nuclear-reset — hardened", () => {
  it("has rate limiting", () => {
    const src = readRoute("org/nuclear-reset/route.ts");
    expect(src).toContain("checkRateLimit");
  });

  it("requires confirmation body", () => {
    const src = readRoute("org/nuclear-reset/route.ts");
    expect(src).toContain("RESET_MY_ORG");
  });

  it("enforces ADMIN/OWNER role", () => {
    const src = readRoute("org/nuclear-reset/route.ts");
    expect(src).toContain("ADMIN");
    expect(src).toContain("OWNER");
  });
});

/* ------------------------------------------------------------------ */
/*  6. video-reports share/revoke — org-scoped updates                 */
/* ------------------------------------------------------------------ */

describe("video-reports — org-scoped mutations", () => {
  it("share route uses updateMany with orgId", () => {
    const src = readRoute("video-reports/[id]/share/route.ts");
    // Should use updateMany (which allows non-unique WHERE) with orgId
    expect(src).toContain("updateMany");
    expect(src).toContain("orgId");
  });

  it("revoke route uses updateMany with orgId", () => {
    const src = readRoute("video-reports/[id]/revoke/route.ts");
    expect(src).toContain("updateMany");
    expect(src).toContain("orgId");
  });
});

/* ------------------------------------------------------------------ */
/*  7. Broad pattern: no bare delete without prior org check           */
/* ------------------------------------------------------------------ */

describe("No bare findUnique on user-supplied IDs in hardened routes", () => {
  const hardenedRoutes = [
    "vin/cart/route.ts",
    "notifications/[id]/route.ts",
    "work-orders/[id]/route.ts",
    "materials/estimates/route.ts",
  ];

  for (const routePath of hardenedRoutes) {
    it(`${routePath} does not use findUnique on user-supplied IDs`, () => {
      const src = readRoute(routePath);
      // These routes should use findFirst (which supports composite where) not findUnique
      // Exception: findUnique on relations (e.g. include) is fine
      const lines = src.split("\n");
      const findUniqueLines = lines.filter(
        (l) => l.includes("findUnique") && !l.trim().startsWith("//") && !l.includes("// safe") // allow explicitly marked safe cases
      );
      expect(findUniqueLines).toHaveLength(0);
    });
  }
});
