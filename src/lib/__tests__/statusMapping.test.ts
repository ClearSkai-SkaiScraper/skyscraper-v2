/**
 * Status Mapping Tests
 *
 * Verifies the canonical 4-stage workflow mapping is correct
 * for all known raw DB statuses.
 */

import { describe, expect, it } from "vitest";

import {
  getWorkflowBadgeColor,
  getWorkflowStatusInfo,
  groupByWorkflowStatus,
  mapToWorkflowStatus,
  WORKFLOW_STATUSES,
} from "../statusMapping";

describe("mapToWorkflowStatus", () => {
  it("maps intake-stage keywords correctly", () => {
    expect(mapToWorkflowStatus("new")).toBe("NEW_INTAKE");
    expect(mapToWorkflowStatus("intake")).toBe("NEW_INTAKE");
    expect(mapToWorkflowStatus("new_intake")).toBe("NEW_INTAKE");
    expect(mapToWorkflowStatus("filed")).toBe("NEW_INTAKE");
    expect(mapToWorkflowStatus("lead")).toBe("NEW_INTAKE");
    expect(mapToWorkflowStatus("qualified")).toBe("NEW_INTAKE");
  });

  it("maps in-progress keywords correctly", () => {
    expect(mapToWorkflowStatus("in_progress")).toBe("IN_PROGRESS");
    expect(mapToWorkflowStatus("in-progress")).toBe("IN_PROGRESS");
    expect(mapToWorkflowStatus("active")).toBe("IN_PROGRESS");
    expect(mapToWorkflowStatus("inspection")).toBe("IN_PROGRESS");
    expect(mapToWorkflowStatus("build")).toBe("IN_PROGRESS");
    expect(mapToWorkflowStatus("production")).toBe("IN_PROGRESS");
    expect(mapToWorkflowStatus("scheduled")).toBe("IN_PROGRESS");
    expect(mapToWorkflowStatus("negotiation")).toBe("IN_PROGRESS");
  });

  it("maps finalizing keywords correctly", () => {
    expect(mapToWorkflowStatus("finalizing")).toBe("FINALIZING");
    expect(mapToWorkflowStatus("final_qa")).toBe("FINALIZING");
    expect(mapToWorkflowStatus("invoiced")).toBe("FINALIZING");
    expect(mapToWorkflowStatus("approved")).toBe("FINALIZING");
    expect(mapToWorkflowStatus("pending_payment")).toBe("FINALIZING");
    expect(mapToWorkflowStatus("warranty")).toBe("FINALIZING");
  });

  it("maps finished keywords correctly", () => {
    expect(mapToWorkflowStatus("finished")).toBe("FINISHED");
    expect(mapToWorkflowStatus("completed")).toBe("FINISHED");
    expect(mapToWorkflowStatus("done")).toBe("FINISHED");
    expect(mapToWorkflowStatus("closed")).toBe("FINISHED");
    expect(mapToWorkflowStatus("won")).toBe("FINISHED");
    expect(mapToWorkflowStatus("paid")).toBe("FINISHED");
    expect(mapToWorkflowStatus("denied")).toBe("FINISHED");
    expect(mapToWorkflowStatus("lost")).toBe("FINISHED");
  });

  it("defaults unknown statuses to NEW_INTAKE", () => {
    expect(mapToWorkflowStatus("random_unknown")).toBe("NEW_INTAKE");
    expect(mapToWorkflowStatus("")).toBe("NEW_INTAKE");
    expect(mapToWorkflowStatus(null)).toBe("NEW_INTAKE");
    expect(mapToWorkflowStatus(undefined)).toBe("NEW_INTAKE");
  });

  it("is case-insensitive", () => {
    expect(mapToWorkflowStatus("NEW")).toBe("NEW_INTAKE");
    expect(mapToWorkflowStatus("In_Progress")).toBe("IN_PROGRESS");
    expect(mapToWorkflowStatus("FINALIZING")).toBe("FINALIZING");
    expect(mapToWorkflowStatus("FINISHED")).toBe("FINISHED");
  });

  it("trims whitespace", () => {
    expect(mapToWorkflowStatus("  active  ")).toBe("IN_PROGRESS");
    expect(mapToWorkflowStatus("  done  ")).toBe("FINISHED");
  });

  it("normalizes spaces to underscores", () => {
    expect(mapToWorkflowStatus("in progress")).toBe("IN_PROGRESS");
    expect(mapToWorkflowStatus("new intake")).toBe("NEW_INTAKE");
    expect(mapToWorkflowStatus("final qa")).toBe("FINALIZING");
  });
});

describe("WORKFLOW_STATUSES", () => {
  it("has exactly 4 statuses", () => {
    expect(WORKFLOW_STATUSES).toHaveLength(4);
  });

  it("covers all canonical values", () => {
    const values = WORKFLOW_STATUSES.map((s) => s.value);
    expect(values).toEqual(["NEW_INTAKE", "IN_PROGRESS", "FINALIZING", "FINISHED"]);
  });

  it("each status has required fields", () => {
    for (const status of WORKFLOW_STATUSES) {
      expect(status.value).toBeTruthy();
      expect(status.label).toBeTruthy();
      expect(status.emoji).toBeTruthy();
      expect(status.badgeColor).toBeTruthy();
      expect(status.dotColor).toBeTruthy();
    }
  });
});

describe("getWorkflowStatusInfo", () => {
  it("returns correct info for each status", () => {
    expect(getWorkflowStatusInfo("NEW_INTAKE").label).toBe("New Intake");
    expect(getWorkflowStatusInfo("IN_PROGRESS").label).toBe("In Progress");
    expect(getWorkflowStatusInfo("FINALIZING").label).toBe("Finalizing");
    expect(getWorkflowStatusInfo("FINISHED").label).toBe("Finished");
  });
});

describe("getWorkflowBadgeColor", () => {
  it("returns badge color for raw DB statuses", () => {
    const newColor = getWorkflowBadgeColor("new");
    expect(newColor).toContain("blue");

    const activeColor = getWorkflowBadgeColor("active");
    expect(activeColor).toContain("amber");

    const doneColor = getWorkflowBadgeColor("done");
    expect(doneColor).toContain("emerald");
  });

  it("handles null input", () => {
    const color = getWorkflowBadgeColor(null);
    expect(color).toBeTruthy(); // Defaults to NEW_INTAKE = blue
  });
});

describe("groupByWorkflowStatus", () => {
  it("groups raw counts into canonical buckets", () => {
    const rawCounts = {
      new: 5,
      filed: 3,
      active: 10,
      inspection: 2,
      invoiced: 4,
      done: 7,
      closed: 1,
    };

    const grouped = groupByWorkflowStatus(rawCounts);

    expect(grouped.NEW_INTAKE).toBe(8); // 5 + 3
    expect(grouped.IN_PROGRESS).toBe(12); // 10 + 2
    expect(grouped.FINALIZING).toBe(4);
    expect(grouped.FINISHED).toBe(8); // 7 + 1
  });

  it("handles empty input", () => {
    const grouped = groupByWorkflowStatus({});
    expect(grouped.NEW_INTAKE).toBe(0);
    expect(grouped.IN_PROGRESS).toBe(0);
    expect(grouped.FINALIZING).toBe(0);
    expect(grouped.FINISHED).toBe(0);
  });
});
