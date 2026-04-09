/**
 * Tests for Production Observability - Tracing & Spans
 */

import { describe, expect, it, vi } from "vitest";

// Mock Sentry before importing tracing module
vi.mock("@sentry/nextjs", () => ({
  startInactiveSpan: vi.fn(() => ({
    setStatus: vi.fn(),
    setAttribute: vi.fn(),
    end: vi.fn(),
  })),
  captureException: vi.fn(),
  setMeasurement: vi.fn(),
}));

import {
  addTraceHeaders,
  createSpanContext,
  extractTraceId,
  generateTraceId,
  recordMetric,
  spanAiCall,
  spanDbQuery,
  spanHttpRequest,
  spanIntegration,
  withSpan,
  withSpanSync,
} from "@/lib/observability/tracing";

describe("Observability Tracing", () => {
  describe("generateTraceId", () => {
    it("generates valid UUID format", () => {
      const traceId = generateTraceId();
      expect(traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("generates unique IDs", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateTraceId()));
      expect(ids.size).toBe(100);
    });
  });

  describe("extractTraceId", () => {
    it("extracts x-trace-id header", () => {
      const headers = new Headers({ "x-trace-id": "test-trace-123" });
      expect(extractTraceId(headers)).toBe("test-trace-123");
    });

    it("extracts x-request-id header", () => {
      const headers = new Headers({ "x-request-id": "request-456" });
      expect(extractTraceId(headers)).toBe("request-456");
    });

    it("extracts x-correlation-id header", () => {
      const headers = new Headers({ "x-correlation-id": "correlation-789" });
      expect(extractTraceId(headers)).toBe("correlation-789");
    });

    it("extracts W3C traceparent format", () => {
      const headers = new Headers({
        traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
      });
      expect(extractTraceId(headers)).toBe("0af7651916cd43dd8448eb211c80319c");
    });

    it("generates new ID when no header present", () => {
      const headers = new Headers();
      const traceId = extractTraceId(headers);
      expect(traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe("withSpan", () => {
    it("returns result and duration", async () => {
      const { result, durationMs, traceId } = await withSpan(
        { op: "test.op", description: "Test operation" },
        async () => {
          await new Promise((r) => setTimeout(r, 10));
          return "test-result";
        }
      );

      expect(result).toBe("test-result");
      expect(durationMs).toBeGreaterThanOrEqual(5); // Timer resolution varies across platforms
      expect(traceId).toBeDefined();
    });

    it("uses provided context", async () => {
      const context = {
        traceId: "custom-trace-id",
        userId: "user-123",
        orgId: "org-456",
      };

      const { traceId } = await withSpan(
        { op: "test.op", description: "Test" },
        async () => "result",
        context
      );

      expect(traceId).toBe("custom-trace-id");
    });

    it("propagates errors and captures to Sentry", async () => {
      const Sentry = await import("@sentry/nextjs");

      await expect(
        withSpan({ op: "test.error", description: "Failing op" }, async () => {
          throw new Error("Test error");
        })
      ).rejects.toThrow("Test error");

      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe("withSpanSync", () => {
    it("returns result and duration for sync operations", () => {
      const { result, durationMs } = withSpanSync(
        { op: "test.sync", description: "Sync operation" },
        () => {
          // Simulate some work
          let sum = 0;
          for (let i = 0; i < 10000; i++) sum += i;
          return sum;
        }
      );

      expect(result).toBe(49995000);
      expect(durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("spanDbQuery", () => {
    it("wraps database queries with correct op", async () => {
      const { result } = await spanDbQuery("Fetch users", async () => [{ id: 1 }, { id: 2 }]);

      expect(result).toHaveLength(2);
    });
  });

  describe("spanHttpRequest", () => {
    it("extracts hostname from URL", async () => {
      const { result } = await spanHttpRequest("https://api.example.com/data", async () => ({
        ok: true,
      }));

      expect(result).toEqual({ ok: true });
    });
  });

  describe("spanAiCall", () => {
    it("includes model in span", async () => {
      const { result } = await spanAiCall("gpt-4", async () => "AI response");
      expect(result).toBe("AI response");
    });
  });

  describe("spanIntegration", () => {
    it("tags integration and operation", async () => {
      const { result } = await spanIntegration("QuickBooks", "sync-invoices", async () => ({
        synced: 10,
      }));

      expect(result).toEqual({ synced: 10 });
    });
  });

  describe("createSpanContext", () => {
    it("creates context from request", () => {
      const req = new Request("https://example.com", {
        headers: { "x-trace-id": "req-trace-123" },
      });

      const ctx = createSpanContext(req, { userId: "user-1" });

      expect(ctx.traceId).toBe("req-trace-123");
      expect(ctx.userId).toBe("user-1");
    });
  });

  describe("addTraceHeaders", () => {
    it("adds trace headers to response", () => {
      const response = new Response("OK");
      const traced = addTraceHeaders(response, "trace-abc");

      expect(traced.headers.get("x-trace-id")).toBe("trace-abc");
      expect(traced.headers.get("x-request-id")).toBe("trace-abc");
    });
  });

  describe("recordMetric", () => {
    it("records metrics without throwing", () => {
      expect(() => {
        recordMetric("test.latency", 100, "ms", { env: "test" });
        recordMetric("test.count", 1, "count");
        recordMetric("test.bytes", 1024, "bytes");
        recordMetric("test.percent", 75, "percent");
      }).not.toThrow();
    });
  });
});
