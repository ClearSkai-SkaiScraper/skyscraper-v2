/**
 * GET /api/health/deep
 *
 * Deep health check endpoint for monitoring at scale.
 * Tests database connectivity, cache availability, and memory usage.
 * Returns a structured health report for uptime monitors and dashboards.
 *
 * Status codes:
 *   200 — healthy
 *   503 — unhealthy (DB down)
 *   207 — degraded (slow DB or cache down)
 */

import { NextResponse } from "next/server";

import { deepHealthCheck } from "@/lib/scale/health";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await deepHealthCheck();

    const statusCode =
      health.status === "unhealthy" ? 503 : health.status === "degraded" ? 207 : 200;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
