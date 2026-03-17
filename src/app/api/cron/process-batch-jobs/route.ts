/**
 * Cron endpoint for processing approved batch jobs
 * Runs every 5 minutes via Vercel Cron
 */

import { NextResponse } from "next/server";

import { processBatchJob } from "@/lib/batch-processing/processor";
import { verifyCronSecret } from "@/lib/cron/verifyCronSecret";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    logger.debug("[Cron] Starting batch job processor");

    // Find approved jobs that aren't being processed
    const approvedJobs = await prisma.batchJob.findMany({
      where: {
        status: "APPROVED",
      },
      take: 5, // Process up to 5 jobs at once
      orderBy: {
        createdAt: "asc", // FIFO
      },
    });

    logger.debug(`[Cron] Found ${approvedJobs.length} approved jobs`);

    if (approvedJobs.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Process each job (in parallel for speed)
    const results = await Promise.allSettled(approvedJobs.map((job) => processBatchJob(job.id)));

    // Count successes and failures
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    logger.debug(`[Cron] Processed ${succeeded} jobs, ${failed} failed`);

    return NextResponse.json({
      success: true,
      processed: approvedJobs.length,
      succeeded,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Cron] Error processing batch jobs:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unknown error",
      },
      { status: 500 }
    );
  }
}
