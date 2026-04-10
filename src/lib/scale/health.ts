/**
 * src/lib/scale/health.ts
 *
 * Runtime health checks for 10K-user scale monitoring.
 * Used by /api/health endpoints and observability dashboards.
 *
 * Enhanced with:
 * - Integration status checks
 * - Trace ID correlation
 * - Structured observability metrics
 */

import { aiCircuitBreaker } from "@/lib/ai/circuitBreaker";
import { generateTraceId, recordMetric, withSpan } from "@/lib/observability/tracing";
import prisma from "@/lib/prisma";

interface IntegrationStatus {
  name: string;
  configured: boolean;
  environment?: string;
}

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  traceId: string;
  version: string;
  database: {
    connected: boolean;
    latencyMs: number;
    activeConnections?: number;
  };
  cache: {
    available: boolean;
    latencyMs: number;
  };
  storage: {
    available: boolean;
    latencyMs: number;
  };
  integrations: IntegrationStatus[];
  aiCircuitBreaker: {
    state: string;
    consecutiveFailures: number;
    totalTrips: number;
  };
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    percentUsed: number;
  };
  uptime: number;
  timestamp: string;
}

/**
 * Full system health check — call from /api/health/deep
 */
export async function deepHealthCheck(): Promise<HealthCheck> {
  const traceId = generateTraceId();
  const start = Date.now();
  let dbConnected = false;
  let dbLatency = 0;
  let cacheAvailable = false;
  let cacheLatency = 0;
  let storageAvailable = false;
  let storageLatency = 0;

  // ── Database check ──────────────────────────────────────────────
  try {
    const { durationMs } = await withSpan(
      { op: "health.db", description: "Database ping" },
      async () => {
        await prisma.$queryRaw`SELECT 1`;
        return true;
      },
      { traceId }
    );
    dbLatency = durationMs;
    dbConnected = true;
    recordMetric("health.db.latency", dbLatency, "ms");
  } catch {
    dbLatency = Date.now() - start;
    recordMetric("health.db.error", 1, "count");
  }

  // ── Cache check (Upstash Redis) ─────────────────────────────────
  try {
    const cacheStart = Date.now();
    // eslint-disable-next-line no-restricted-syntax
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      // eslint-disable-next-line no-restricted-syntax
      const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
        // eslint-disable-next-line no-restricted-syntax
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
        signal: AbortSignal.timeout(3000),
      });
      cacheAvailable = res.ok;
    }
    cacheLatency = Date.now() - cacheStart;
    recordMetric("health.cache.latency", cacheLatency, "ms");
  } catch {
    cacheLatency = Date.now() - start;
    recordMetric("health.cache.error", 1, "count");
  }

  // ── Storage check (Supabase) ────────────────────────────────────
  try {
    const storageStart = Date.now();
    // eslint-disable-next-line no-restricted-syntax
    if (process.env.SUPABASE_URL) {
      // eslint-disable-next-line no-restricted-syntax
      const res = await fetch(`${process.env.SUPABASE_URL}/storage/v1/bucket`, {
        headers: {
          // eslint-disable-next-line no-restricted-syntax
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}`,
          // eslint-disable-next-line no-restricted-syntax
          apikey: process.env.SUPABASE_ANON_KEY || "",
        },
        signal: AbortSignal.timeout(3000),
      });
      storageAvailable = res.ok;
    }
    storageLatency = Date.now() - storageStart;
    recordMetric("health.storage.latency", storageLatency, "ms");
  } catch {
    storageLatency = Date.now() - start;
  }

  // ── Integration status ──────────────────────────────────────────
  const integrations: IntegrationStatus[] = [
    {
      name: "quickbooks",
      // eslint-disable-next-line no-restricted-syntax
      configured: !!(process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET),
      // eslint-disable-next-line no-restricted-syntax
      environment: process.env.QUICKBOOKS_ENVIRONMENT || "sandbox",
    },
    {
      name: "abc_supply",
      // eslint-disable-next-line no-restricted-syntax
      configured: !!(process.env.ABC_SUPPLY_API_KEY && process.env.ABC_SUPPLY_API_SECRET),
      // eslint-disable-next-line no-restricted-syntax
      environment: process.env.ABC_SUPPLY_ENVIRONMENT || "sandbox",
    },
    {
      name: "openai",
      // eslint-disable-next-line no-restricted-syntax
      configured: !!process.env.OPENAI_API_KEY,
    },
    {
      name: "sentry",
      // eslint-disable-next-line no-restricted-syntax
      configured: !!(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN),
    },
    {
      name: "stripe",
      // eslint-disable-next-line no-restricted-syntax
      configured: !!process.env.STRIPE_SECRET_KEY,
    },
  ];

  // ── Memory ──────────────────────────────────────────────────────
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1_048_576);
  const heapTotalMB = Math.round(mem.heapTotal / 1_048_576);
  const rssMB = Math.round(mem.rss / 1_048_576);
  const percentUsed = Math.round((heapUsedMB / heapTotalMB) * 100);

  recordMetric("health.memory.heap_used", heapUsedMB, "bytes");
  recordMetric("health.memory.percent", percentUsed, "percent");

  // ── Version ─────────────────────────────────────────────────────
  let version = "1.0.0";
  try {
    const fs = await import("fs/promises");
    version = (await fs.readFile("VERSION", "utf-8")).trim();
  } catch {
    // eslint-disable-next-line no-restricted-syntax
    version = process.env.npm_package_version || "1.0.0";
  }

  // ── AI Circuit Breaker ──────────────────────────────────────────
  const cbState = aiCircuitBreaker.getState();

  // ── Overall status ──────────────────────────────────────────────
  let status: HealthCheck["status"] = "healthy";
  if (!dbConnected) status = "unhealthy";
  else if (dbLatency > 500 || !cacheAvailable || !storageAvailable || cbState.state === "OPEN")
    status = "degraded";

  recordMetric(
    "health.status",
    status === "healthy" ? 1 : status === "degraded" ? 0.5 : 0,
    "count"
  );

  return {
    status,
    traceId,
    version,
    database: { connected: dbConnected, latencyMs: dbLatency },
    cache: { available: cacheAvailable, latencyMs: cacheLatency },
    storage: { available: storageAvailable, latencyMs: storageLatency },
    integrations,
    aiCircuitBreaker: {
      state: cbState.state,
      consecutiveFailures: cbState.consecutiveFailures,
      totalTrips: cbState.totalTrips,
    },
    memory: {
      heapUsedMB,
      heapTotalMB,
      rssMB,
      percentUsed,
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}
