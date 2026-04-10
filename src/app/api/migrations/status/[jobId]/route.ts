/**
 * Single Migration Job API
 * GET /api/migrations/status/[jobId] — Detailed migration report
 * POST /api/migrations/status/[jobId] — Control (pause, resume, cancel, rollback)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/migrations/status/[jobId]
 * Get detailed migration report including item-level breakdown
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (_request: NextRequest, { orgId, userId }, routeParams) => {
  const { jobId } = await routeParams.params;

  try {
    const job = await prisma.migration_jobs.findFirst({
      where: { id: jobId, orgId },
    });

    if (!job) {
      return NextResponse.json({ error: "Migration not found" }, { status: 404 });
    }

    // Get item-level stats
    const itemStats = await prisma.migration_items.groupBy({
      by: ["entityType"],
      where: { migrationId: jobId },
      _count: true,
    });

    // Get recent errors
    const errors = Array.isArray(job.errors) ? job.errors.slice(0, 50) : [];

    // Calculate duration
    const startTime = new Date(job.createdAt).getTime();
    const endTime = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
    const durationSeconds = Math.round((endTime - startTime) / 1000);

    // Calculate rates
    const totalImported = job.importedRecords;
    const recordsPerMinute =
      durationSeconds > 0 ? Math.round((totalImported / durationSeconds) * 60) : 0;

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        source: job.source,
        status: job.status,
        totalRecords: job.totalRecords,
        importedRecords: job.importedRecords,
        skippedRecords: job.skippedRecords,
        errorRecords: job.errorRecords,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        config: job.config,
        stats: job.stats,
      },
      breakdown: itemStats.reduce(
        (acc, stat) => {
          acc[stat.entityType.toLowerCase()] = stat._count;
          return acc;
        },
        {} as Record<string, number>
      ),
      errors,
      metrics: {
        durationSeconds,
        durationFormatted: formatDuration(durationSeconds),
        recordsPerMinute,
        successRate:
          job.totalRecords > 0 ? Math.round((job.importedRecords / job.totalRecords) * 100) : 0,
      },
    });
  } catch (error) {
    logger.error("[Migration Report] Error:", error);
    return NextResponse.json({ error: "Failed to fetch migration details" }, { status: 500 });
  }
});

/**
 * POST /api/migrations/status/[jobId]
 * Control migration: pause, resume, cancel, rollback
 */
const ActionSchema = z.object({
  action: z.enum(["pause", "resume", "cancel", "rollback"]),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withAuth(async (request: NextRequest, { orgId, userId }, routeParams) => {
  const { jobId } = await routeParams.params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid action", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { action } = parsed.data;

  try {
    const job = await prisma.migration_jobs.findFirst({
      where: { id: jobId, orgId },
    });

    if (!job) {
      return NextResponse.json({ error: "Migration not found" }, { status: 404 });
    }

    switch (action) {
      case "pause":
        if (!["RUNNING", "PENDING"].includes(job.status)) {
          return NextResponse.json({ error: "Can only pause running migrations" }, { status: 400 });
        }
        await prisma.migration_jobs.update({
          where: { id: jobId },
          data: { status: "PAUSED" },
        });
        return NextResponse.json({
          success: true,
          message: "Migration paused",
          status: "PAUSED",
        });

      case "resume":
        if (job.status !== "PAUSED") {
          return NextResponse.json({ error: "Can only resume paused migrations" }, { status: 400 });
        }
        // Mark as pending - the worker will pick it up
        await prisma.migration_jobs.update({
          where: { id: jobId },
          data: { status: "PENDING" },
        });
        return NextResponse.json({
          success: true,
          message: "Migration queued for resume",
          status: "PENDING",
        });

      case "cancel":
        if (["COMPLETED", "FAILED", "CANCELLED"].includes(job.status)) {
          return NextResponse.json({ error: "Migration already finished" }, { status: 400 });
        }
        await prisma.migration_jobs.update({
          where: { id: jobId },
          data: { status: "CANCELLED", completedAt: new Date() },
        });
        return NextResponse.json({
          success: true,
          message: "Migration cancelled",
          status: "CANCELLED",
        });

      case "rollback":
        if (!["COMPLETED", "FAILED", "CANCELLED", "PAUSED"].includes(job.status)) {
          return NextResponse.json(
            { error: "Can only rollback finished or paused migrations" },
            { status: 400 }
          );
        }

        // Start rollback - delete imported records
        await prisma.migration_jobs.update({
          where: { id: jobId },
          data: { status: "ROLLING_BACK" },
        });

        // Get all imported items
        const items = await prisma.migration_items.findMany({
          where: { migrationId: jobId },
          select: { entityType: true, internalId: true },
        });

        // Delete in batches by entity type
        const contactIds = items
          .filter((i) => i.entityType === "CONTACT" && i.internalId)
          .map((i) => i.internalId!);
        const jobIds = items
          .filter((i) => i.entityType === "JOB" && i.internalId)
          .map((i) => i.internalId!);

        // Delete jobs first (may have foreign key to contacts)
        if (jobIds.length > 0) {
          await prisma.crm_jobs.deleteMany({
            where: { id: { in: jobIds }, org_id: orgId },
          });
        }

        // Delete contacts
        if (contactIds.length > 0) {
          await prisma.contacts.deleteMany({
            where: { id: { in: contactIds }, orgId },
          });
        }

        // Delete migration items
        await prisma.migration_items.deleteMany({
          where: { migrationId: jobId },
        });

        // Mark as rolled back
        await prisma.migration_jobs.update({
          where: { id: jobId },
          data: {
            status: "CANCELLED",
            completedAt: new Date(),
            stats: {
              ...(typeof job.stats === "object" ? job.stats : {}),
              rolledBack: true,
              rollbackAt: new Date().toISOString(),
              recordsDeleted: items.length,
            },
          },
        });

        return NextResponse.json({
          success: true,
          message: `Rollback complete. Deleted ${items.length} records.`,
          status: "CANCELLED",
          recordsDeleted: items.length,
        });

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("[Migration Control] Error:", error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
});

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
