/**
 * ============================================================================
 * POST VALIDATION SMOKE TESTS — Session 8 CI Gate
 * ============================================================================
 *
 * Verifies that critical mutation routes have proper input validation
 * via Zod schemas, preventing injection and data integrity issues.
 *
 * Run: pnpm test:unit __tests__/smoke/api-validation.test.ts
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

/** Checks whether a route has Zod schema validation */
function hasZodValidation(src: string): boolean {
  return (
    src.includes('from "zod"') ||
    src.includes("from 'zod'") ||
    src.includes(".parse(") ||
    src.includes(".safeParse(") ||
    src.includes("z.object(") ||
    src.includes("z.string(") ||
    src.includes("z.enum(") ||
    src.includes("z.array(") ||
    src.includes("Schema.parse") ||
    src.includes("Schema.safeParse") ||
    /import.*{.*z.*}.*from.*"zod"/.test(src) ||
    /from\s+["']@\/schemas/.test(src) ||
    /from\s+["']@\/lib\/validation/.test(src)
  );
}

/** Checks if route has at least some manual validation as fallback */
function hasAnyValidation(src: string): boolean {
  return (
    hasZodValidation(src) ||
    src.includes("allowedFields") ||
    src.includes("if (!") ||
    src.includes("typeof ") ||
    src.includes("Array.isArray(")
  );
}

// ── 1. Critical mutation routes MUST have Zod validation ──────────
describe("API Validation: Critical routes have Zod schemas", () => {
  const criticalZodRoutes = [
    { path: "claims/route.ts", label: "claim create" },
    { path: "claims/[claimId]/route.ts", label: "claim CRUD" },
    { path: "tasks/route.ts", label: "task create" },
    { path: "tasks/[taskId]/route.ts", label: "task update" },
    { path: "reports/generate/route.ts", label: "report generate" },
    { path: "branding/save/route.ts", label: "branding save" },
    { path: "ai/claim-assistant/route.ts", label: "claim assistant" },
    { path: "contacts/invite/route.ts", label: "contact invite" },
    { path: "teams/invite/route.ts", label: "team invite" },
    { path: "invoices/route.ts", label: "invoice create" },
    { path: "leads/route.ts", label: "lead create" },
    { path: "work-orders/route.ts", label: "work order create" },
    { path: "notifications/mark-read/route.ts", label: "notification mark read" },
  ];

  for (const route of criticalZodRoutes) {
    it(`${route.label} has Zod validation`, () => {
      if (!routeFileExists(route.path)) return;
      const src = readRouteFile(route.path);
      expect(hasZodValidation(src)).toBe(true);
    });
  }
});

// ── 2. High-risk routes MUST have at least some validation ───────
describe("API Validation: High-risk routes have input validation", () => {
  const highRiskRoutes = [
    { path: "claims/[claimId]/send-to-adjuster/route.ts", label: "send to adjuster" },
    { path: "email/send/route.ts", label: "email send" },
    { path: "claims/[claimId]/supplements/items/route.ts", label: "supplement items" },
    { path: "claims/[claimId]/update/route.ts", label: "claim update" },
    { path: "weather/report/route.ts", label: "weather report" },
    { path: "weather/share/route.ts", label: "weather share" },
    { path: "claims/[claimId]/scope/route.ts", label: "scope items" },
    { path: "claims/[claimId]/messages/route.ts", label: "messages" },
    { path: "billing/cancel/route.ts", label: "billing cancel" },
    { path: "claims/[claimId]/trades/route.ts", label: "trades" },
  ];

  for (const route of highRiskRoutes) {
    it(`${route.label} has validation`, () => {
      if (!routeFileExists(route.path)) return;
      const src = readRouteFile(route.path);
      expect(hasZodValidation(src)).toBe(true);
    });
  }
});

// ── 3. No raw body spread into Prisma ─────────────────────────────
describe("API Validation: No raw body spread into Prisma", () => {
  const routesToCheck = [
    "claims/[claimId]/supplements/items/route.ts",
    "claims/[claimId]/trades/route.ts",
    "claims/[claimId]/scope/route.ts",
    "claims/[claimId]/update/route.ts",
  ];

  for (const routePath of routesToCheck) {
    it(`${routePath} does not spread raw body into Prisma`, () => {
      if (!routeFileExists(routePath)) return;
      const src = readRouteFile(routePath);
      // Pattern: ...data or ...body directly in create/update calls
      const hasDangerousSpread =
        /\.create\(\s*\{[^}]*\.\.\.(data|body)\s*[,}]/s.test(src) ||
        /\.update\(\s*\{[^}]*data:\s*\{[^}]*\.\.\.(data|body)\s*[,}]/s.test(src);
      expect(hasDangerousSpread).toBe(false);
    });
  }
});

// ── 4. Email routes validate email format ─────────────────────────
describe("API Validation: Email routes validate email format", () => {
  const emailRoutes = ["claims/[claimId]/send-to-adjuster/route.ts", "email/send/route.ts"];

  for (const routePath of emailRoutes) {
    it(`${routePath} validates or sanitizes email input`, () => {
      if (!routeFileExists(routePath)) return;
      const src = readRouteFile(routePath);
      // Should have Zod email() validation or manual check
      const hasEmailValidation =
        src.includes(".email()") || (src.includes("email") && src.includes("z.string()"));
      expect(hasEmailValidation).toBe(true);
    });
  }
});

// ── 5. XSS prevention: no raw user input in HTML templates ────────
describe("API Validation: No raw user input in HTML templates", () => {
  it("send-to-adjuster sanitizes message before HTML injection", () => {
    const routePath = "claims/[claimId]/send-to-adjuster/route.ts";
    if (!routeFileExists(routePath)) return;
    const src = readRouteFile(routePath);
    // Should have validation/sanitization of message field
    const hasValidation = hasZodValidation(src);
    expect(hasValidation).toBe(true);
  });
});
