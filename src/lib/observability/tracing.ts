/**
 * Production Observability - Tracing & Spans
 *
 * Provides:
 * - Request correlation IDs
 * - Performance spans for critical paths
 * - Integration with Sentry/Datadog
 * - Structured context propagation
 */

import * as Sentry from "@sentry/nextjs";

// ============================================================================
// Types
// ============================================================================

export interface SpanContext {
  /** Unique request/trace ID */
  traceId: string;
  /** Parent span ID (for nested spans) */
  parentSpanId?: string;
  /** User ID for attribution */
  userId?: string;
  /** Organization ID */
  orgId?: string;
  /** Claim ID (if in claim context) */
  claimId?: string;
}

export interface SpanOptions {
  /** Operation name (e.g., "db.query", "http.request") */
  op: string;
  /** Human-readable description */
  description: string;
  /** Additional tags */
  tags?: Record<string, string | number | boolean>;
  /** Additional data */
  data?: Record<string, unknown>;
}

export interface SpanResult<T> {
  result: T;
  durationMs: number;
  traceId: string;
}

// ============================================================================
// Trace ID Generation
// ============================================================================

/**
 * Generate a unique trace ID for request correlation
 */
export function generateTraceId(): string {
  // Use crypto.randomUUID if available, fallback to timestamp + random
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Extract trace ID from request headers
 */
export function extractTraceId(headers: Headers): string {
  // Check common trace header formats
  return (
    headers.get("x-trace-id") ||
    headers.get("x-request-id") ||
    headers.get("x-correlation-id") ||
    headers.get("traceparent")?.split("-")[1] || // W3C Trace Context
    generateTraceId()
  );
}

// ============================================================================
// Span Instrumentation
// ============================================================================

/**
 * Create a performance span and measure execution time
 *
 * @example
 * const { result, durationMs } = await withSpan(
 *   { op: "db.query", description: "Fetch user claims" },
 *   async () => await db.claims.findMany({ where: { userId } })
 * );
 */
export async function withSpan<T>(
  options: SpanOptions,
  fn: () => Promise<T>,
  context?: SpanContext
): Promise<SpanResult<T>> {
  const traceId = context?.traceId || generateTraceId();
  const startTime = performance.now();

  // Start Sentry span
  const span = Sentry.startInactiveSpan({
    name: options.description,
    op: options.op,
    attributes: {
      ...options.tags,
      traceId,
      ...(context?.userId && { userId: context.userId }),
      ...(context?.orgId && { orgId: context.orgId }),
      ...(context?.claimId && { claimId: context.claimId }),
    },
  });

  try {
    const result = await fn();
    const durationMs = performance.now() - startTime;

    // Set span status and data
    span.setStatus({ code: 1 }); // OK
    span.setAttribute("durationMs", durationMs);

    if (options.data) {
      Object.entries(options.data).forEach(([key, value]) => {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          span.setAttribute(key, value);
        }
      });
    }

    span.end();

    return { result, durationMs, traceId };
  } catch (error) {
    const durationMs = performance.now() - startTime;

    // Mark span as errored
    span.setStatus({ code: 2, message: error instanceof Error ? error.message : "Unknown error" });
    span.setAttribute("error", true);
    span.setAttribute("durationMs", durationMs);
    span.end();

    // Capture to Sentry with context
    Sentry.captureException(error, {
      tags: {
        op: options.op,
        traceId,
      },
      contexts: {
        span: {
          description: options.description,
          durationMs,
          ...options.tags,
        },
      },
    });

    throw error;
  }
}

/**
 * Synchronous span wrapper for non-async operations
 */
export function withSpanSync<T>(
  options: SpanOptions,
  fn: () => T,
  context?: SpanContext
): SpanResult<T> {
  const traceId = context?.traceId || generateTraceId();
  const startTime = performance.now();

  const span = Sentry.startInactiveSpan({
    name: options.description,
    op: options.op,
    attributes: {
      ...options.tags,
      traceId,
    },
  });

  try {
    const result = fn();
    const durationMs = performance.now() - startTime;

    span.setStatus({ code: 1 });
    span.setAttribute("durationMs", durationMs);
    span.end();

    return { result, durationMs, traceId };
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const durationMs = performance.now() - startTime;

    span.setStatus({ code: 2, message: error instanceof Error ? error.message : "Unknown error" });
    span.setAttribute("error", true);
    span.end();

    Sentry.captureException(error, {
      tags: { op: options.op, traceId },
    });

    throw error;
  }
}

// ============================================================================
// Common Operation Spans
// ============================================================================

/**
 * Database query span
 */
export async function spanDbQuery<T>(
  description: string,
  fn: () => Promise<T>,
  context?: SpanContext
): Promise<SpanResult<T>> {
  return withSpan({ op: "db.query", description }, fn, context);
}

/**
 * External HTTP request span
 */
export async function spanHttpRequest<T>(
  url: string,
  fn: () => Promise<T>,
  context?: SpanContext
): Promise<SpanResult<T>> {
  const urlObj = new URL(url);
  return withSpan(
    {
      op: "http.client",
      description: `${urlObj.hostname}${urlObj.pathname}`,
      tags: { host: urlObj.hostname },
    },
    fn,
    context
  );
}

/**
 * AI/LLM call span
 */
export async function spanAiCall<T>(
  model: string,
  fn: () => Promise<T>,
  context?: SpanContext
): Promise<SpanResult<T>> {
  return withSpan(
    {
      op: "ai.completion",
      description: `AI: ${model}`,
      tags: { model },
    },
    fn,
    context
  );
}

/**
 * File/storage operation span
 */
export async function spanStorage<T>(
  operation: "read" | "write" | "delete" | "list",
  path: string,
  fn: () => Promise<T>,
  context?: SpanContext
): Promise<SpanResult<T>> {
  return withSpan(
    {
      op: `storage.${operation}`,
      description: `Storage: ${operation} ${path}`,
      tags: { operation, path },
    },
    fn,
    context
  );
}

/**
 * Integration call span (QuickBooks, ABC Supply, etc.)
 */
export async function spanIntegration<T>(
  integration: string,
  operation: string,
  fn: () => Promise<T>,
  context?: SpanContext
): Promise<SpanResult<T>> {
  return withSpan(
    {
      op: "integration.call",
      description: `${integration}: ${operation}`,
      tags: { integration, operation },
    },
    fn,
    context
  );
}

// ============================================================================
// Request Context Middleware Helper
// ============================================================================

/**
 * Create span context from Next.js request
 */
export function createSpanContext(req: Request, extra?: Partial<SpanContext>): SpanContext {
  return {
    traceId: extractTraceId(req.headers),
    ...extra,
  };
}

/**
 * Add trace ID to response headers
 */
export function addTraceHeaders(response: Response, traceId: string): Response {
  const headers = new Headers(response.headers);
  headers.set("x-trace-id", traceId);
  headers.set("x-request-id", traceId);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ============================================================================
// Metrics Collection
// ============================================================================

interface MetricData {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
  timestamp: number;
}

const metricsBuffer: MetricData[] = [];
const METRICS_FLUSH_INTERVAL = 10000; // 10 seconds
const METRICS_BUFFER_SIZE = 100;

/**
 * Record a metric (counter, gauge, histogram)
 */
export function recordMetric(
  name: string,
  value: number,
  unit: "ms" | "count" | "bytes" | "percent",
  tags?: Record<string, string>
): void {
  metricsBuffer.push({
    name,
    value,
    unit,
    tags,
    timestamp: Date.now(),
  });

  // Flush if buffer is full
  if (metricsBuffer.length >= METRICS_BUFFER_SIZE) {
    void flushMetrics();
  }
}

/**
 * Flush metrics to observability backend
 */
export async function flushMetrics(): Promise<void> {
  if (metricsBuffer.length === 0) return;

  const metrics = metricsBuffer.splice(0, metricsBuffer.length);

  // Send to Sentry as custom metrics
  try {
    for (const metric of metrics) {
      Sentry.setMeasurement(metric.name, metric.value, metric.unit as "second");
    }
  } catch (err) {
    console.error("[OBSERVABILITY] Failed to flush metrics:", err);
  }
}

// Auto-flush on interval
if (typeof setInterval !== "undefined") {
  setInterval(flushMetrics, METRICS_FLUSH_INTERVAL);
}
