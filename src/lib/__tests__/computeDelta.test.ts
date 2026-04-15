/**
 * Delta Detection Engine Tests
 *
 * Verifies adjuster vs contractor scope comparison logic.
 * Core business logic — must be deterministic (no AI).
 */

import { describe, expect, it } from "vitest";

import {
  computeDelta,
  computeDeltaStats,
  computeTotalDelta,
  type ScopeLineItem,
} from "../delta/computeDelta";

const makeItem = (
  description: string,
  qty: number,
  unitPrice: number,
  total?: number
): ScopeLineItem => ({
  description,
  qty,
  unitPrice,
  total: total ?? qty * unitPrice,
});

describe("computeDelta", () => {
  it("detects MISSING items (contractor has, adjuster doesn't)", () => {
    const adjuster: ScopeLineItem[] = [];
    const contractor = [makeItem("Ridge cap replacement", 25, 12, 300)];

    const variances = computeDelta(adjuster, contractor);

    expect(variances).toHaveLength(1);
    expect(variances[0].kind).toBe("MISSING");
    expect(variances[0].description).toBe("Ridge cap replacement");
    expect(variances[0].deltaTotal).toBe(300);
  });

  it("detects QTY_MISMATCH when quantities differ", () => {
    const adjuster = [makeItem("Shingle removal", 10, 50, 500)];
    const contractor = [makeItem("Shingle removal", 20, 50, 1000)];

    const variances = computeDelta(adjuster, contractor);

    const qtyMismatch = variances.find((v) => v.kind === "QTY_MISMATCH");
    expect(qtyMismatch).toBeDefined();
    expect(qtyMismatch!.deltaTotal).toBe(500); // 1000 - 500
  });

  it("detects UNDERPAID when adjuster unit price is lower", () => {
    const adjuster = [makeItem("Ice & water shield", 10, 30, 300)];
    const contractor = [makeItem("Ice & water shield", 10, 50, 500)];

    const variances = computeDelta(adjuster, contractor);

    const underpaid = variances.find((v) => v.kind === "UNDERPAID");
    expect(underpaid).toBeDefined();
    expect(underpaid!.deltaTotal).toBe(200); // 500 - 300
  });

  it("returns empty array when scopes match exactly", () => {
    const scope = [makeItem("Felt underlayment", 15, 20, 300)];

    const variances = computeDelta(scope, scope);

    expect(variances).toHaveLength(0);
  });

  it("sorts variances by delta (highest first)", () => {
    const adjuster: ScopeLineItem[] = [];
    const contractor = [
      makeItem("Small item", 1, 100, 100),
      makeItem("Large item", 1, 5000, 5000),
      makeItem("Medium item", 1, 1000, 1000),
    ];

    const variances = computeDelta(adjuster, contractor);

    expect(variances[0].deltaTotal).toBe(5000);
    expect(variances[1].deltaTotal).toBe(1000);
    expect(variances[2].deltaTotal).toBe(100);
  });

  it("matches descriptions case-insensitively", () => {
    const adjuster = [makeItem("SHINGLE REMOVAL", 10, 50, 500)];
    const contractor = [makeItem("shingle removal", 10, 50, 500)];

    const variances = computeDelta(adjuster, contractor);

    // Should match — no variances
    expect(variances).toHaveLength(0);
  });

  it("handles both empty scopes", () => {
    const variances = computeDelta([], []);
    expect(variances).toHaveLength(0);
  });

  it("assigns correct severity levels", () => {
    const adjuster: ScopeLineItem[] = [];
    const contractor = [
      makeItem("Low item", 1, 100, 100), // low (< $500)
      makeItem("Medium item", 1, 800, 800), // medium ($500-$2000)
      makeItem("High item", 1, 5000, 5000), // high (> $2000)
    ];

    const variances = computeDelta(adjuster, contractor);

    const low = variances.find((v) => v.description === "Low item");
    const medium = variances.find((v) => v.description === "Medium item");
    const high = variances.find((v) => v.description === "High item");

    expect(low!.severity).toBe("low");
    expect(medium!.severity).toBe("medium");
    expect(high!.severity).toBe("high");
  });
});

describe("computeTotalDelta", () => {
  it("sums all variance deltas", () => {
    const adjuster: ScopeLineItem[] = [];
    const contractor = [makeItem("Item A", 1, 1000, 1000), makeItem("Item B", 1, 2000, 2000)];

    const variances = computeDelta(adjuster, contractor);
    const total = computeTotalDelta(variances);

    expect(total).toBe(3000);
  });

  it("returns 0 for empty variances", () => {
    expect(computeTotalDelta([])).toBe(0);
  });
});

describe("computeDeltaStats", () => {
  it("computes correct summary statistics", () => {
    const adjuster: ScopeLineItem[] = [];
    const contractor = [makeItem("Missing A", 1, 100, 100), makeItem("Missing B", 1, 3000, 3000)];

    const variances = computeDelta(adjuster, contractor);
    const stats = computeDeltaStats(variances);

    expect(stats.totalVariances).toBe(2);
    expect(stats.totalDelta).toBe(3100);
    expect(stats.missingItems).toBe(2);
    expect(stats.highSeverity).toBe(1); // 3000 > 2000
    expect(stats.lowSeverity).toBe(1); // 100 < 500
  });

  it("handles empty variances", () => {
    const stats = computeDeltaStats([]);

    expect(stats.totalVariances).toBe(0);
    expect(stats.totalDelta).toBe(0);
    expect(stats.highSeverity).toBe(0);
    expect(stats.missingItems).toBe(0);
  });
});
