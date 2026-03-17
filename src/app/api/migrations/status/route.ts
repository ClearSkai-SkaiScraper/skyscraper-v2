/**
 * Migration Status & Report API
 * GET /api/migrations/status — List all migrations for org
 * GET /api/migrations/status/[jobId] — Get specific migration details
 * POST /api/migrations/status/[jobId] — Control migration (pause, resume, cancel, rollback)
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/migrations/status
 * List all migrations for the authenticated org
 */
export async function GET(request: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const migrations = await prisma.migration_jobs.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        source: true,
        status: true,
        totalRecords: true,
        importedRecords: true,
        skippedRecords: true,
        errorRecords: true,
        createdAt: true,
        completedAt: true,
        stats: true,
      },
    });

    // Calculate summary
    const summary = {
      total: migrations.length,
      completed: migrations.filter((m) => m.status === "COMPLETED").length,
      failed: migrations.filter((m) => m.status === "FAILED").length,
      inProgress: migrations.filter((m) => ["PENDING", "RUNNING"].includes(m.status)).length,
      totalRecordsImported: migrations.reduce((sum, m) => sum + m.importedRecords, 0),
    };

    return NextResponse.json({
      success: true,
      summary,
      migrations: migrations.map((m) => ({
        ...m,
        duration: m.completedAt
          ? Math.round((new Date(m.completedAt).getTime() - new Date(m.createdAt).getTime()) / 1000)
          : null,
      })),
    });
  } catch (error) {
    logger.error("[Migration Status] Error:", error);
    return NextResponse.json({ error: "Failed to fetch migrations" }, { status: 500 });
  }
}
