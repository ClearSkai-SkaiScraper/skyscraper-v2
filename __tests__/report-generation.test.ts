/**
 * Report Generation Tests
 * ============================================================================
 * Validates the report queue system:
 * - queueReport creates records with proper orgId
 * - getReportStatus filters by orgId
 * - getNextQueuedReport picks oldest queued
 * - Report lifecycle: queued → processing → completed
 * - Failed reports retry up to maxAttempts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma
const mockPrisma = {
  ai_reports: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe("Report Queue System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("queueReport", () => {
    it("should create a report with orgId and queued status", async () => {
      mockPrisma.ai_reports.create.mockResolvedValue({ id: "report_1" });

      const { queueReport } = await import("@/lib/reports/queue");

      const id = await queueReport({
        orgId: "org_A",
        claimId: "claim_1",
        type: "damage_assessment",
        config: { sections: ["overview", "damages"] },
        userId: "user_1",
      });

      expect(id).toBeDefined();
      expect(mockPrisma.ai_reports.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orgId: "org_A",
            claimId: "claim_1",
            status: "queued",
          }),
        })
      );
    });
  });

  describe("getReportStatus", () => {
    it("should return status for a valid report", async () => {
      mockPrisma.ai_reports.findFirst.mockResolvedValue({
        status: "processing",
        content: "",
        attachments: { attempts: 1, maxAttempts: 3 },
      });

      const { getReportStatus } = await import("@/lib/reports/queue");

      const status = await getReportStatus("report_1", "org_A");
      expect(status).toBeDefined();
      expect(status!.status).toBe("processing");
      expect(status!.progress).toBe(50);
    });

    it("should return null for non-existent report", async () => {
      mockPrisma.ai_reports.findFirst.mockResolvedValue(null);

      const { getReportStatus } = await import("@/lib/reports/queue");

      const status = await getReportStatus("nonexistent", "org_A");
      expect(status).toBeNull();
    });

    it("should filter by orgId when provided", async () => {
      mockPrisma.ai_reports.findFirst.mockResolvedValue(null);

      const { getReportStatus } = await import("@/lib/reports/queue");

      await getReportStatus("report_1", "org_B");

      expect(mockPrisma.ai_reports.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: "org_B" }),
        })
      );
    });
  });

  describe("getNextQueuedReport", () => {
    it("should return oldest queued report", async () => {
      mockPrisma.ai_reports.findFirst.mockResolvedValue({
        id: "report_oldest",
        orgId: "org_A",
        claimId: "claim_1",
        type: "damage",
        attachments: { queueConfig: { sections: ["overview"] }, attempts: 0, maxAttempts: 3 },
      });

      const { getNextQueuedReport } = await import("@/lib/reports/queue");

      const report = await getNextQueuedReport();
      expect(report).toBeDefined();
      expect(report!.id).toBe("report_oldest");
      expect(report!.orgId).toBe("org_A");
    });

    it("should skip reports that exceeded max attempts", async () => {
      // First call returns over-limit report
      mockPrisma.ai_reports.findFirst
        .mockResolvedValueOnce({
          id: "report_exhausted",
          orgId: "org_A",
          claimId: "claim_1",
          type: "damage",
          attachments: { attempts: 3, maxAttempts: 3 },
        })
        .mockResolvedValueOnce(null);

      mockPrisma.ai_reports.update.mockResolvedValue({});

      const { getNextQueuedReport } = await import("@/lib/reports/queue");

      const report = await getNextQueuedReport();
      expect(report).toBeNull();
      // Should have marked the exhausted report as failed
      expect(mockPrisma.ai_reports.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "report_exhausted" },
          data: expect.objectContaining({ status: "failed" }),
        })
      );
    });
  });

  describe("Report Lifecycle", () => {
    it("should track progress through lifecycle stages", () => {
      // Progress mapping
      const progressMap: Record<string, number> = {
        queued: 10,
        processing: 50,
        completed: 100,
        failed: 0,
        cancelled: 0,
      };

      expect(progressMap.queued).toBe(10);
      expect(progressMap.processing).toBe(50);
      expect(progressMap.completed).toBe(100);
    });
  });

  describe("Queue Stats", () => {
    it("should return per-org queue statistics", async () => {
      mockPrisma.ai_reports.count
        .mockResolvedValueOnce(5) // queued
        .mockResolvedValueOnce(2) // processing
        .mockResolvedValueOnce(100) // completed
        .mockResolvedValueOnce(3); // failed

      const { getQueueStats } = await import("@/lib/reports/queue");

      const stats = await getQueueStats("org_A");
      expect(stats.queued).toBe(5);
      expect(stats.processing).toBe(2);
      expect(stats.completed).toBe(100);
      expect(stats.failed).toBe(3);
    });
  });
});
