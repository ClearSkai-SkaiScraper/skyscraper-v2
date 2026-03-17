export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Readiness probe endpoint
 * Checks if the application is ready to serve traffic (database connectivity).
 * Uses safe Prisma singleton that doesn't crash builds when DB is unavailable.
 */
export async function GET() {
  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          status: "not_ready",
          timestamp: new Date().toISOString(),
          checks: {
            database: "not_configured",
            prisma: "not_configured",
          },
          error: "DATABASE_URL not configured",
          service: "skaiscraper",
          version: "3.0.0",
        },
        { status: 503 }
      );
    }
    const hasDb = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres');
    if (!hasDb) {
      return NextResponse.json({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        checks: { database: 'skipped', prisma: 'skipped' },
        reason: 'DATABASE_URL not configured for postgres',
        service: 'skaiscraper',
        version: '3.0.0'
      });
    }

    // Test database connection with safe Prisma client
    if (false) {
      return NextResponse.json(
        {
          status: "not_ready",
          timestamp: new Date().toISOString(),
          checks: {
            database: "unavailable",
            prisma: "stub_mode",
          },
          error: "Prisma client running in stub mode",
          service: "skaiscraper",
          version: "3.0.0",
        },
        { status: 503 }
      );
    }

    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: "ok",
        prisma: "ok",
      },
      service: "skaiscraper",
      version: "3.0.0",
    });
  } catch (error) {
    logger.error("[health/ready] Database check failed:", error);
    return NextResponse.json(
      {
        status: "not_ready",
        timestamp: new Date().toISOString(),
        checks: {
          database: "failed",
          prisma: "failed",
        },
        error: "Database connection failed",
        service: "skaiscraper",
        version: "3.0.0",
      },
      { status: 503 }
    );
  }
}
