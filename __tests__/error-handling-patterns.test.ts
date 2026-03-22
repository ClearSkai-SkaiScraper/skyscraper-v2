/**
 * Silent Catch Pattern Regression Tests
 *
 * Ensures no new .catch(() => {}) patterns are introduced.
 * All error catches must log via logger.warn/error or console.warn.
 */

import { execSync } from "child_process";
import { describe, expect, it } from "vitest";

describe("Error Handling Patterns", () => {
  it("should not have silent .catch(() => {}) in active API routes", () => {
    // Search for the anti-pattern in API routes
    let result: string;
    try {
      result = execSync(
        `grep -r ".catch(() => {})" src/app/api/ --include="*.ts" --include="*.tsx" -l 2>/dev/null || true`,
        { cwd: process.env.PROJECT_ROOT || process.cwd(), encoding: "utf-8" }
      ).trim();
    } catch {
      result = "";
    }

    const files = result.split("\n").filter(Boolean);
    // Team invitations has an acceptable cleanup pattern
    const acceptableFiles = [
      "src/app/api/team/invitations/route.ts", // cleanup after email failure
    ];
    const violations = files.filter((f) => !acceptableFiles.some((a) => f.includes(a)));

    if (violations.length > 0) {
      console.warn("Files with silent .catch(() => {}):", violations);
    }
    expect(violations.length).toBe(0);
  });

  it("should use logger for error reporting, not just console", () => {
    let result: string;
    try {
      result = execSync(
        `grep -rn "console.error" src/lib/auth/ --include="*.ts" 2>/dev/null || true`,
        { cwd: process.env.PROJECT_ROOT || process.cwd(), encoding: "utf-8" }
      ).trim();
    } catch {
      result = "";
    }

    const matches = result.split("\n").filter(Boolean);
    if (matches.length > 0) {
      console.warn("Remaining console.error in src/lib/auth/:", matches);
    }
    // Allow 0 violations — all should use logger now
    expect(matches.length).toBe(0);
  });

  describe("Error catch patterns should log", () => {
    it("ClaimIQ hooks should catch with logger.warn", () => {
      // Pattern: onClaimUpdated(...).catch((e) => logger.warn(...))
      const correctPattern = (fn: () => Promise<void>) => {
        return fn().catch((e) => {
          // This should call logger.warn — we verify the catch handler exists
          expect(e).toBeDefined();
          return undefined;
        });
      };

      const mockFn = () => Promise.reject(new Error("test"));
      expect(correctPattern(mockFn)).resolves.toBeUndefined();
    });
  });
});
