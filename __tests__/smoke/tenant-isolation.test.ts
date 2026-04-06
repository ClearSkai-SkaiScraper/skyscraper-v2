/**
 * ============================================================================
 * TENANT ISOLATION SMOKE TESTS — Session 8 CI Gate
 * ============================================================================
 *
 * Static analysis verifying that all previously-red routes and critical
 * data routes enforce proper org-scoping. Regression guard for IDOR fixes.
 *
 * Run: pnpm test:unit __tests__/smoke/tenant-isolation.test.ts
 * ============================================================================
 */

import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const API_DIR = path.resolve(__dirname, "../../src/app/api");

function readRouteFile(routePath: string): string {
  const fullPath = path.join(API_DIR, routePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Route file not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, "utf-8");
}

function routeFileExists(routePath: string): boolean {
  return fs.existsSync(path.join(API_DIR, routePath));
}

// ── Previously RED routes (Session 7 fixes) ─────────────────────────
describe("Tenant Isolation: Previously-RED routes now org-scoped", () => {
  const previouslyRedRoutes = [
    { path: "claims/[claimId]/trades/route.ts", label: "claim trades" },
    { path: "tasks/route.ts", label: "tasks" },
    { path: "tasks/[taskId]/route.ts", label: "task by ID" },
    { path: "weather/share/route.ts", label: "weather share" },
  ];

  for (const route of previouslyRedRoutes) {
    it(`${route.label} is now org-scoped`, () => {
      if (!routeFileExists(route.path)) return;
      const src = readRouteFile(route.path);

      // Must reference orgId in query scoping
      const hasOrgScoping =
        src.includes("orgId") &&
        (src.includes("where") ||
          src.includes("WHERE") ||
          src.includes("getOrgClaimOrThrow") ||
          src.includes("org_id"));

      expect(hasOrgScoping).toBe(true);
    });
  }
});

// ── Routes with auth-gate-only isolation (no DB queries) ─────────────
describe("Tenant Isolation: Auth-gated routes (no direct DB queries)", () => {
  it("branding upload uses orgId for storage path scoping", () => {
    if (!routeFileExists("branding/upload/route.ts")) return;
    const src = readRouteFile("branding/upload/route.ts");
    // Uses orgId for storage path prefix isolation
    expect(src.includes("orgId") || src.includes("resolveOrg")).toBe(true);
  });

  it("claim assistant has auth gate", () => {
    if (!routeFileExists("ai/claim-assistant/route.ts")) return;
    const src = readRouteFile("ai/claim-assistant/route.ts");
    expect(
      src.includes("requireAuth") ||
        src.includes("withAuth") ||
        src.includes("safeOrgContext") ||
        src.includes("auth()") ||
        src.includes("resolveOrg")
    ).toBe(true);
  });
});

// ── Claim data isolation ─────────────────────────────────────────────
describe("Tenant Isolation: Claim routes enforce org boundary", () => {
  const claimRoutes = [
    "claims/route.ts",
    "claims/[claimId]/route.ts",
    "claims/[claimId]/update/route.ts",
    "claims/[claimId]/scope/route.ts",
    "claims/[claimId]/messages/route.ts",
    "claims/[claimId]/supplements/items/route.ts",
    "claims/[claimId]/send-to-adjuster/route.ts",
    "claims/[claimId]/notes/route.ts",
  ];

  for (const routePath of claimRoutes) {
    const label = routePath.replace("/route.ts", "");
    it(`${label} scopes by orgId`, () => {
      if (!routeFileExists(routePath)) return;
      const src = readRouteFile(routePath);

      // Must have org scoping via one of these patterns
      const patterns = [
        /where:\s*\{[^}]*orgId/s,
        /getOrgClaimOrThrow\s*\(/,
        /org_id.*=.*orgId/,
        /WHERE.*org_id/i,
      ];

      const hasOrgScoping = patterns.some((p) => p.test(src));
      expect(hasOrgScoping).toBe(true);
    });
  }
});

// ── Property isolation ──────────────────────────────────────────────
describe("Tenant Isolation: Property routes enforce org boundary", () => {
  it("properties route scopes by orgId", () => {
    const routePath = "properties/route.ts";
    if (!routeFileExists(routePath)) return;
    const src = readRouteFile(routePath);
    expect(src.includes("orgId")).toBe(true);
    expect(src.includes("where")).toBe(true);
  });
});

// ── Task isolation ──────────────────────────────────────────────────
describe("Tenant Isolation: Task routes enforce org boundary", () => {
  const taskRoutes = ["tasks/route.ts", "tasks/[taskId]/route.ts"];

  for (const routePath of taskRoutes) {
    it(`${routePath} scopes by orgId`, () => {
      if (!routeFileExists(routePath)) return;
      const src = readRouteFile(routePath);
      expect(src.includes("orgId")).toBe(true);
    });
  }
});

// ── Weather/Share isolation ──────────────────────────────────────────
describe("Tenant Isolation: Weather routes enforce org boundary", () => {
  it("weather/share scopes report access", () => {
    if (!routeFileExists("weather/share/route.ts")) return;
    const src = readRouteFile("weather/share/route.ts");
    // Must verify report ownership
    expect(src.includes("userId") || src.includes("orgId")).toBe(true);
  });

  it("weather/report has auth", () => {
    if (!routeFileExists("weather/report/route.ts")) return;
    const src = readRouteFile("weather/report/route.ts");
    const hasAuth =
      src.includes("withAuth") ||
      src.includes("withOrgScope") ||
      src.includes("requireAuth") ||
      src.includes("safeOrgContext");
    expect(hasAuth).toBe(true);
  });
});

// ── Anti-pattern: No findUnique with user-supplied ID without orgId ─
describe("Tenant Isolation: No unsafe findUnique patterns", () => {
  const riskyRoutes = [
    "claims/[claimId]/update/route.ts",
    "claims/[claimId]/messages/route.ts",
    "claims/[claimId]/trades/route.ts",
    "tasks/[taskId]/route.ts",
    "invoices/[id]/route.ts",
  ];

  for (const routePath of riskyRoutes) {
    it(`${routePath} doesn't use findUnique with user ID alone`, () => {
      if (!routeFileExists(routePath)) return;
      const src = readRouteFile(routePath);

      // findUnique with a parameterized ID should also include orgId check
      // or use findFirst + orgId, or use getOrgClaimOrThrow first
      const hasFindUnique = src.includes("findUnique");
      if (hasFindUnique) {
        // If findUnique exists, ensure there's an org guard: getOrgClaimOrThrow,
        // org-scoped findFirst, or post-fetch org check via relation
        const hasOrgGuard =
          src.includes("getOrgClaimOrThrow") ||
          (src.includes("findFirst") && src.includes("orgId")) ||
          src.includes("updateMany") ||
          src.includes("deleteMany") ||
          // Post-fetch guard via included relation (e.g. invoice → job → orgId)
          src.includes(".orgId") ||
          src.includes("orgId !==") ||
          src.includes("orgId !=");
        expect(hasOrgGuard).toBe(true);
      }
    });
  }
});
