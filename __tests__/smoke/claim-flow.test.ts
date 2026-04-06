/**
 * ============================================================================
 * CLAIM GOLDEN PATH SMOKE TESTS — Session 8 CI Gate
 * ============================================================================
 *
 * Verifies the critical claim lifecycle patterns are properly structured.
 * Static analysis ensures code integrity for the most important workflows.
 *
 * Run: pnpm test:unit __tests__/smoke/claim-flow.test.ts
 * ============================================================================
 */

import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const API_DIR = path.resolve(__dirname, "../../src/app/api");
const APP_DIR = path.resolve(__dirname, "../../src/app/(app)");

function readFile(filePath: string): string {
  const fullPath = path.resolve(__dirname, "../../", filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, "utf-8");
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(path.resolve(__dirname, "../../", filePath));
}

// ── 1. Claim CREATE route structure ──────────────────────────────
describe("Claim Flow: Create route", () => {
  it("POST claims/ has Zod validation", () => {
    const src = readFile("src/app/api/claims/route.ts");
    expect(src.includes("z.object") || src.includes(".parse(") || src.includes(".safeParse(")).toBe(
      true
    );
  });

  it("POST claims/ requires auth", () => {
    const src = readFile("src/app/api/claims/route.ts");
    expect(
      src.includes("withAuth") ||
        src.includes("requireAuth") ||
        src.includes("safeOrgContext") ||
        src.includes("auth()")
    ).toBe(true);
  });

  it("POST claims/ scopes by orgId", () => {
    const src = readFile("src/app/api/claims/route.ts");
    expect(src.includes("orgId")).toBe(true);
  });

  it("POST claims/ generates CUID for ID", () => {
    const src = readFile("src/app/api/claims/route.ts");
    expect(src.includes("createId") || src.includes("cuid") || src.includes("randomUUID")).toBe(
      true
    );
  });
});

// ── 2. Claim WORKSPACE pages exist ──────────────────────────────
describe("Claim Flow: Workspace pages", () => {
  const workspacePages = [
    "src/app/(app)/claims/page.tsx",
    "src/app/(app)/claims/[claimId]/page.tsx",
    "src/app/(app)/claims/new/page.tsx",
  ];

  for (const pagePath of workspacePages) {
    it(`${pagePath} exists`, () => {
      expect(fileExists(pagePath)).toBe(true);
    });
  }

  it("claims list page has error.tsx boundary", () => {
    expect(fileExists("src/app/(app)/claims/error.tsx")).toBe(true);
  });

  it("claims detail page has error.tsx boundary", () => {
    expect(fileExists("src/app/(app)/claims/[claimId]/error.tsx")).toBe(true);
  });

  it("claims list page has loading.tsx", () => {
    expect(fileExists("src/app/(app)/claims/loading.tsx")).toBe(true);
  });
});

// ── 3. Claim UPDATE route structure ─────────────────────────────
describe("Claim Flow: Update route", () => {
  it("PATCH claims/[claimId]/update has allowedFields whitelist", () => {
    const src = readFile("src/app/api/claims/[claimId]/update/route.ts");
    expect(src.includes("allowedFields")).toBe(true);
  });

  it("PATCH claims/[claimId]/update uses updateMany for TOCTOU safety", () => {
    const src = readFile("src/app/api/claims/[claimId]/update/route.ts");
    expect(src.includes("updateMany")).toBe(true);
  });

  it("PATCH claims/[claimId]/update verifies org ownership first", () => {
    const src = readFile("src/app/api/claims/[claimId]/update/route.ts");
    expect(src.includes("getOrgClaimOrThrow")).toBe(true);
  });
});

// ── 4. Report generation route exists and is validated ──────────
describe("Claim Flow: Report generation", () => {
  it("reports/generate exists and has auth", () => {
    const src = readFile("src/app/api/reports/generate/route.ts");
    expect(
      src.includes("withAuth") || src.includes("requireAuth") || src.includes("safeOrgContext")
    ).toBe(true);
  });

  it("reports/generate has Zod validation", () => {
    const src = readFile("src/app/api/reports/generate/route.ts");
    expect(src.includes("z.object") || src.includes(".parse(") || src.includes(".safeParse(")).toBe(
      true
    );
  });
});

// ── 5. Claim DELETE is safe ──────────────────────────────────────
describe("Claim Flow: Delete safety", () => {
  it("DELETE claims/[claimId] verifies org ownership", () => {
    const src = readFile("src/app/api/claims/[claimId]/route.ts");
    expect(
      src.includes("getOrgClaimOrThrow") ||
        src.includes("withOrgScope") ||
        src.includes("requirePermission") ||
        (src.includes("orgId") &&
          (src.includes("deleteMany") || src.includes("findFirst") || src.includes("updateMany")))
    ).toBe(true);
  });
});

// ── 6. Branding data smoke ──────────────────────────────────────
describe("Claim Flow: Branding data", () => {
  it("branding/save route validates input", () => {
    if (!fileExists("src/app/api/branding/save/route.ts")) return;
    const src = readFile("src/app/api/branding/save/route.ts");
    expect(
      src.includes("z.object") ||
        src.includes(".parse(") ||
        src.includes("brandingSchema") ||
        src.includes("validation/schemas") ||
        src.includes("validation/middleware")
    ).toBe(true);
  });

  it("branding route scopes by orgId", () => {
    if (!fileExists("src/app/api/branding/route.ts")) return;
    const src = readFile("src/app/api/branding/route.ts");
    expect(src.includes("orgId")).toBe(true);
  });
});
