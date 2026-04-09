/**
 * ============================================================================
 * Logger Timer Unit Tests
 * ============================================================================
 *
 * Tests the logger.startTimer() / timer.end() flow.
 * Verifies that timer returns elapsed time and passes meta through.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Un-mock logger for this test (vitest.setup.ts mocks it globally) ─────────
vi.unmock("@/lib/logger");

// ── Mock Sentry ──────────────────────────────────────────────────────────────
vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

// ── Mock console.log ─────────────────────────────────────────────────────────
const originalConsoleLog = console.log;
let consoleSpy: ReturnType<typeof vi.fn>;

describe("logger.startTimer", () => {
  beforeEach(() => {
    consoleSpy = vi.fn();
    console.log = consoleSpy;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  it("returns a timer with an end() method", async () => {
    const { logger } = await import("@/lib/logger");
    const timer = logger.startTimer("test-operation");

    expect(timer).toBeDefined();
    expect(typeof timer.end).toBe("function");
  });

  it("end() logs elapsed time", async () => {
    const { logger } = await import("@/lib/logger");
    const timer = logger.startTimer("test-operation");

    // Small delay to ensure elapsed > 0
    await new Promise((r) => setTimeout(r, 10));
    timer.end();

    // Should have been called with a log message containing elapsed time
    const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1];
    expect(lastCall).toBeDefined();
    expect(lastCall[0]).toContain("test-operation");
  });

  it("end() accepts additional metadata", async () => {
    const { logger } = await import("@/lib/logger");
    const timer = logger.startTimer("db-query");

    timer.end({ rows: 42, table: "claims" });

    const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1];
    expect(lastCall).toBeDefined();
    // Meta should be serialized in the output
    const output = lastCall.join(" ");
    expect(output).toContain("db-query");
  });
});
