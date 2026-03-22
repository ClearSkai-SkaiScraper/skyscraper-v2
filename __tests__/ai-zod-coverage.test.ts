/**
 * AI Zod Coverage Regression Guard
 *
 * Scans every /api/ai/* route file and ensures all routes that accept
 * user input have Zod validation — either via the central `validateAIRequest`
 * helper OR via inline `.parse()` / `.safeParse()` calls.
 *
 * If this test fails, a new AI route was added without input validation.
 */
import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

const AI_ROUTES_DIR = path.resolve(__dirname, "../src/app/api/ai");

/** Routes verified-safe without Zod (no user input at all). */
const EXEMPT_ROUTES = new Set([
  "smart-actions", // GET only — reads DB, no user input
  "usage", // GET only — reads billing context
  "vision/selftest", // GET only — pings OpenAI
  "job-scanner", // GET only — scans DB, no body
  "geometry/detect-slopes", // 501 stub — Phase 2
  "video/stream", // 501 stub — Phase 3
  "product-context", // GET only — no input at all
  "estimate/[claimId]", // POST but no body parsing — claimId from URL only
  "suggest-status", // withAiBilling GET — no user body
  "status", // GET only — reads DB state
  "recommendations", // GET only — optional claimId query, withAiBilling wrapped
  "debug/yolo", // Debug endpoint — manual imageUrl validation, not production input
]);

function findRouteFiles(dir: string, base = ""): { relPath: string; absPath: string }[] {
  const results: { relPath: string; absPath: string }[] = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      results.push(...findRouteFiles(full, rel));
    } else if (entry.name === "route.ts" || entry.name === "route.tsx") {
      results.push({ relPath: base, absPath: full });
    }
  }
  return results;
}

/** Check if a route file has any form of Zod validation */
function hasZodValidation(content: string): boolean {
  return (
    content.includes("validateAIRequest") ||
    content.includes(".parse(") ||
    content.includes(".safeParse(")
  );
}

describe("AI Zod Coverage", () => {
  const routes = findRouteFiles(AI_ROUTES_DIR);

  it("should find AI route files", () => {
    expect(routes.length).toBeGreaterThan(10);
  });

  for (const { relPath, absPath } of routes) {
    if (EXEMPT_ROUTES.has(relPath)) continue;

    it(`/api/ai/${relPath} should have Zod validation`, () => {
      const content = fs.readFileSync(absPath, "utf-8");
      expect(
        hasZodValidation(content),
        `Route /api/ai/${relPath} has no Zod validation (validateAIRequest, .parse(), or .safeParse())`
      ).toBe(true);
    });
  }
});
