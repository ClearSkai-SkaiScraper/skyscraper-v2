export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/health/db
 * Database health check — verifies Prisma connection + basic query
 *
 * Returns:
 *   200 { status: "ok", latencyMs }   — DB is reachable
 *   503 { status: "degraded", error }  — DB is unreachable
 */

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET() {
  const start = Date.now();

  try {
    // Simple connectivity check — SELECT 1
    await prisma.$queryRaw`SELECT 1 AS health`;
    const latencyMs = Date.now() - start;

    // Optional: check for schema drift by counting a known table
    const orgCount = await prisma.org.count();

    return NextResponse.json({
      status: "ok",
      latencyMs,
      orgCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const latencyMs = Date.now() - start;
    logger.error("[HEALTH_DB] Database health check failed", { error: String(error), latencyMs });

    return NextResponse.json(
      {
        status: "degraded",
        latencyMs,
        error: "Database unreachable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
