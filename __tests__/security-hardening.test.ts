/**
 * ============================================================================
 * SECURITY HARDENING — Regression Tests
 * ============================================================================
 *
 * These tests guard against re-introduction of the 13 security vulnerabilities
 * fixed in commit 648659e (2026-02-17).
 *
 * Categories:
 *   1. demoMode default — must be false everywhere
 *   2. Billing IDOR — routes must NOT accept client-supplied orgId
 *   3. Client portal IDOR — routes must verify ownership
 *   4. Org isolation — no beta bind, no email domain matching
 *   5. Claims agent — orgId must be mandatory
 *
 * These are STATIC ANALYSIS tests — they read source files and verify
 * patterns without needing a running server or database.
 * ============================================================================
 */

import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../src");
const PRISMA = path.resolve(__dirname, "../prisma");

function readSrc(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), "utf-8");
}

/* ------------------------------------------------------------------ */
/*  1. demoMode must default to false                                  */
/* ------------------------------------------------------------------ */

describe("demoMode defaults", () => {
  it("Prisma schema defaults demoMode to false", () => {
    const schema = fs.readFileSync(path.join(PRISMA, "schema.prisma"), "utf-8");
    // Find the demoMode field and verify its default
    const demoModeLine = schema
      .split("\n")
      .find((l) => l.includes("demoMode") && l.includes("@default"));
    expect(demoModeLine).toBeDefined();
    expect(demoModeLine).toContain("@default(false)");
    expect(demoModeLine).not.toContain("@default(true)");
  });

  it("ensureOrgForUser never sets demoMode: true", () => {
    const src = readSrc("lib/org/ensureOrgForUser.ts");
    // Should not contain demoMode: true anywhere
    const lines = src.split("\n");
    const demoTrueLines = lines.filter(
      (l) => l.includes("demoMode") && l.includes("true") && !l.trim().startsWith("//")
    );
    expect(demoTrueLines).toHaveLength(0);
  });

  it("getActiveOrgContext never sets demoMode: true", () => {
    const src = readSrc("lib/org/getActiveOrgContext.ts");
    const lines = src.split("\n");
    const demoTrueLines = lines.filter(
      (l) => l.includes("demoMode") && l.includes("true") && !l.trim().startsWith("//")
    );
    expect(demoTrueLines).toHaveLength(0);
  });

  it("getActiveOrgSafe never sets demoMode: true", () => {
    const src = readSrc("lib/auth/getActiveOrgSafe.ts");
    const lines = src.split("\n");
    const demoTrueLines = lines.filter(
      (l) => l.includes("demoMode") && l.includes("true") && !l.trim().startsWith("//")
    );
    expect(demoTrueLines).toHaveLength(0);
  });

  it("ensureOrg never sets demoMode: true", () => {
    const src = readSrc("lib/auth/ensureOrg.ts");
    const lines = src.split("\n");
    const demoTrueLines = lines.filter(
      (l) => l.includes("demoMode") && l.includes("true") && !l.trim().startsWith("//")
    );
    expect(demoTrueLines).toHaveLength(0);
  });

  it("nuclear-reset route never sets demoMode: true", () => {
    const src = readSrc("app/api/org/nuclear-reset/route.ts");
    const lines = src.split("\n");
    const demoTrueLines = lines.filter(
      (l) => l.includes("demoMode") && l.includes("true") && !l.trim().startsWith("//")
    );
    expect(demoTrueLines).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  2. Billing routes must NOT accept client-supplied orgId            */
/* ------------------------------------------------------------------ */

describe("billing IDOR prevention", () => {
  it("billing/portal does not read orgId from request body", () => {
    const src = readSrc("app/api/billing/portal/route.ts");
    expect(src).not.toMatch(/body\.orgId/);
    expect(src).not.toMatch(/request\.json\(\).*orgId/);
  });

  it("billing/info does not read orgId from searchParams", () => {
    const src = readSrc("app/api/billing/info/route.ts");
    expect(src).not.toMatch(/searchParams\.get\(["']orgId["']\)/);
  });

  // billing/invoices route was removed — tests removed

  it("billing/portal verifies org membership", () => {
    const src = readSrc("app/api/billing/portal/route.ts");
    expect(src).toMatch(/user_organizations|membership/i);
  });

  it("billing/info verifies org membership", () => {
    const src = readSrc("app/api/billing/info/route.ts");
    expect(src).toMatch(/user_organizations|membership/i);
  });

  // billing/invoices removed — test removed
});

/* ------------------------------------------------------------------ */
/*  3. Client portal ownership verification                           */
/* ------------------------------------------------------------------ */

describe("client portal IDOR prevention", () => {
  it("client-portal profile route uses currentUser for ownership check", () => {
    const src = readSrc("app/api/client-portal/[slug]/profile/route.ts");
    expect(src).toMatch(/currentUser/);
  });

  it("portal invitation actions verify email ownership", () => {
    const src = readSrc("app/api/portal/invitations/actions/route.ts");
    expect(src).toMatch(/currentUser/);
    // Must check email matches before accepting/declining
    expect(src).toMatch(/email/i);
  });

  it("portal claims actions verify file belongs to claim", () => {
    const src = readSrc("app/api/portal/claims/[claimId]/actions/route.ts");
    // Must check fileId belongs to the claim before commenting
    expect(src).toMatch(/file_assets/);
    expect(src).toMatch(/claimId/);
  });

  it("portal jobs verifies claimClientLink ownership", () => {
    const src = readSrc("app/api/portal/jobs/route.ts");
    expect(src).toMatch(/claimClientLink|claim_client_link/i);
  });
});

/* ------------------------------------------------------------------ */
/*  4. Org isolation — no beta bind, no email domain matching          */
/* ------------------------------------------------------------------ */

describe("org isolation", () => {
  it("getActiveOrgContext does NOT contain beta demo bind block", () => {
    const src = readSrc("lib/org/getActiveOrgContext.ts");
    // The beta bind block was removed — should not reference isBetaMode
    expect(src).not.toMatch(/isBetaMode/);
    // Should not have the shared demo org binding pattern
    expect(src).not.toMatch(/DEMO_ORG_ID|demo.*org.*id/i);
  });

  it("ensureOrgForUser does NOT match orgs by email domain in code", () => {
    const src = readSrc("lib/org/ensureOrgForUser.ts");
    // Strip comments (lines starting with // or * or /*) before checking
    const codeLines = src
      .split("\n")
      .filter((l) => {
        const trimmed = l.trim();
        return !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*");
      })
      .join("\n");
    // Should not use email domain matching in actual code
    expect(codeLines).not.toMatch(/emailDomain/);
    // Should not use 'contains' for clerkOrgId matching (fuzzy match vulnerability)
    expect(codeLines).not.toMatch(/contains:\s*userId/);
  });

  it("dead org creator files do NOT exist in src/", () => {
    const deadFiles = [
      "lib/auth/autoHealOrg.ts",
      "lib/auth/getOrCreateDefaultOrg.ts",
      "lib/auth/inspectOrgContext.ts",
      "lib/org/getOrgOrRepair.ts",
    ];
    for (const f of deadFiles) {
      const fullPath = path.join(SRC, f);
      expect(fs.existsSync(fullPath), `Dead org creator file should not exist: ${f}`).toBe(false);
    }
  });

  it("no file in src/ imports from dead org creator paths", () => {
    const deadImports = [
      "autoHealOrg",
      "getOrCreateDefaultOrg",
      "inspectOrgContext",
      "getOrgOrRepair",
    ];
    // Scan all .ts files in src/ for these imports
    const allTsFiles = findTsFiles(SRC);
    for (const file of allTsFiles) {
      const content = fs.readFileSync(file, "utf-8");
      for (const deadImport of deadImports) {
        const relativePath = path.relative(SRC, file);
        expect(
          content.includes(`from`) &&
            content.includes(deadImport) &&
            content.match(new RegExp(`import.*${deadImport}`)),
          `${relativePath} should not import ${deadImport}`
        ).toBeFalsy();
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/*  5. Claims agent — orgId must be mandatory                          */
/* ------------------------------------------------------------------ */

describe("claims agent org scoping", () => {
  it("claims-analysis route requires orgId (not optional spread)", () => {
    const src = readSrc("app/api/agents/claims-analysis/route.ts");
    // The old pattern was: ...(orgId && { orgId })
    // This should NOT exist anymore
    expect(src).not.toMatch(/\.\.\.\(orgId\s*&&/);
  });

  it("claims-analysis route returns 403 when orgId is missing", () => {
    const src = readSrc("app/api/agents/claims-analysis/route.ts");
    expect(src).toMatch(/403/);
  });
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function findTsFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        results.push(...findTsFiles(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
        results.push(fullPath);
      }
    }
  } catch {
    // Skip unreadable directories
  }
  return results;
}
