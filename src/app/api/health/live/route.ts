export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/health/live — Enterprise Liveness Probe
 *
 * BetterStack / uptime monitor target endpoint.
 * Tests process health + DB connectivity + critical env vars.
 *
 * Status codes:
 *   200 — healthy (all systems operational)
 *   503 — unhealthy (DB down or critical env missing)
 *   207 — degraded (DB slow > 500ms or optional services missing)
 *
 * Designed for:
 *   - BetterStack uptime monitoring (status.skaiscraper.ai)
 *   - Vercel health checks
 *   - Load balancer routing decisions
 *   - k6 test validation
 */
export async function GET() {
  const start = Date.now();

  try {
    // ── 1. Critical environment validation ────────────────────────
    const requiredEnvVars = ["DATABASE_URL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"];
    const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

    if (missingEnvVars.length > 0) {
      logger.warn("[health/live] Missing critical env vars:", missingEnvVars);
      return NextResponse.json(
        {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          service: "skaiscraper",
          version: getVersion(),
          checks: {
            env: { ok: false, missing: missingEnvVars },
            database: { ok: false, latencyMs: 0 },
          },
          uptime: process.uptime(),
          responseMs: Date.now() - start,
        },
        { status: 503 }
      );
    }

    // ── 2. Database connectivity check ────────────────────────────
    let dbOk = false;
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
      dbOk = true;
    } catch (dbErr) {
      dbLatency = Date.now() - start;
      logger.error("[health/live] DB check failed:", dbErr);
    }

    if (!dbOk) {
      return NextResponse.json(
        {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          service: "skaiscraper",
          version: getVersion(),
          checks: {
            env: { ok: true },
            database: { ok: false, latencyMs: dbLatency, error: "Connection failed" },
          },
          uptime: process.uptime(),
          responseMs: Date.now() - start,
        },
        { status: 503 }
      );
    }

    // ── 3. Memory usage ───────────────────────────────────────────
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1_048_576);
    const heapTotalMB = Math.round(mem.heapTotal / 1_048_576);
    const rssMB = Math.round(mem.rss / 1_048_576);
    // Use RSS vs container limit (1024 MB on Vercel) — heap ratio is
    // misleading on serverless because V8 auto-sizes a small heap.
    const CONTAINER_LIMIT_MB = 1024;
    const memPercent = Math.round((rssMB / CONTAINER_LIMIT_MB) * 100);

    // ── 4. Determine overall status ───────────────────────────────
    const isDegraded = dbLatency > 500 || memPercent > 85;

    // ── 5. Integration availability (non-blocking) ────────────────
    const integrations = {
      clerk: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      sentry: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
      stripe: !!process.env.STRIPE_SECRET_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      supabase: !!process.env.SUPABASE_URL,
      redis: !!process.env.UPSTASH_REDIS_REST_URL,
    };

    const response = {
      status: isDegraded ? "degraded" : "ok",
      timestamp: new Date().toISOString(),
      service: "skaiscraper",
      version: getVersion(),
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
      buildTime: process.env.__BUILD_TIME__ || "unknown",
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || "local",
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
      checks: {
        env: { ok: true },
        database: { ok: true, latencyMs: dbLatency },
        memory: {
          heapUsedMB,
          heapTotalMB,
          rssMB,
          containerLimitMB: CONTAINER_LIMIT_MB,
          percentUsed: memPercent,
        },
      },
      integrations,
      uptime: Math.round(process.uptime()),
      responseMs: Date.now() - start,
    };

    return NextResponse.json(response, { status: isDegraded ? 207 : 200 });
  } catch (error) {
    logger.error("[health/live] Unexpected error:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        service: "skaiscraper",
        version: getVersion(),
        error: "Unknown error",
        uptime: process.uptime(),
        responseMs: Date.now() - start,
      },
      { status: 503 }
    );
  }
}

/** Read version from VERSION file or fallback */
function getVersion(): string {
  try {
    // In Vercel, VERSION is baked into the build
    return process.env.APP_VERSION || "v2.1.0";
  } catch {
    return "v2.1.0";
  }
}
