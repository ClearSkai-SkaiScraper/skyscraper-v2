/**
 * Universal Claims Report Analytics & Metrics
 *
 * Tracks usage metrics for the Universal Report System.
 * Can be extended to store in a dedicated metrics table or analytics service.
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface ReportMetrics {
  totalReports: number;
  reportsThisMonth: number;
  reportsFinalized: number;
  reportsSubmitted: number;
  pdfGenerations: number;
  averageDaysToFinalize: number | null;
  // Weather & AI metrics
  weatherPullsQuick: number;
  weatherPullsFull: number;
  aiTokensUsed: number;
  averageReportBuildTime: number | null; // in minutes
}

/**
 * Get comprehensive report metrics for an organization
 */
export async function getReportMetrics(orgId: string): Promise<ReportMetrics> {
  try {
    // Get all reports for the org using raw query to avoid Prisma client cache issues
    const allReports = await prisma.$queryRaw<any[]>`
      SELECT cr.*, c."createdAt" as claim_created_at
      FROM claim_reports cr
      INNER JOIN claims c ON cr."claimId" = c.id
      WHERE c."orgId" = ${orgId}
    `;

    // Current month start
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate metrics
    const totalReports = allReports.length;
    const reportsThisMonth = allReports.filter((r) => r.createdAt >= monthStart).length;
    const reportsFinalized = allReports.filter(
      (r) => r.status === "finalized" || r.status === "submitted"
    ).length;
    const reportsSubmitted = allReports.filter((r) => r.status === "submitted").length;

    // Calculate average days to finalize
    const finalizedReports = allReports.filter((r) => r.finalizedAt);
    let averageDaysToFinalize: number | null = null;

    if (finalizedReports.length > 0) {
      const totalDays = finalizedReports.reduce((sum, report) => {
        if (!report.finalizedAt) return sum;
        const created = new Date(report.createdAt);
        const finalized = new Date(report.finalizedAt);
        const days = (finalized.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);

      averageDaysToFinalize = Math.round((totalDays / finalizedReports.length) * 10) / 10;
    }

    // PDF generations: check timeline events
    const pdfEvents = await prisma.claim_timeline_events.count({
      where: {
        type: "REPORT_PDF_GENERATED",
        claim_id: {
          in: allReports.map((r) => r.claimId),
        },
      },
    });

    // Weather metrics: count timeline events for weather pulls
    const weatherQuick = await prisma.claim_timeline_events.count({
      where: {
        type: "WEATHER_QUICK_PULL",
        claim_id: {
          in: allReports.map((r) => r.claimId),
        },
      },
    });

    const weatherFull = await prisma.claim_timeline_events.count({
      where: {
        type: "WEATHER_FULL_PULL",
        claim_id: {
          in: allReports.map((r) => r.claimId),
        },
      },
    });

    // AI tokens: check ai_reports table for token usage
    const aiReportsWithTokens = await prisma.ai_reports.findMany({
      where: {
        claims: {
          orgId: orgId,
        },
      },
      select: {
        tokensUsed: true,
      },
    });

    const totalAITokens = aiReportsWithTokens.reduce(
      (sum, report) => sum + (report.tokensUsed || 0),
      0
    );

    // Average report build time: time from creation to finalization
    let averageReportBuildTime: number | null = null;
    if (finalizedReports.length > 0) {
      const totalMinutes = finalizedReports.reduce((sum, report) => {
        if (!report.finalizedAt) return sum;
        const created = new Date(report.createdAt);
        const finalized = new Date(report.finalizedAt);
        const minutes = (finalized.getTime() - created.getTime()) / (1000 * 60);
        return sum + minutes;
      }, 0);

      averageReportBuildTime = Math.round(totalMinutes / finalizedReports.length);
    }

    return {
      totalReports,
      reportsThisMonth,
      reportsFinalized,
      reportsSubmitted,
      pdfGenerations: pdfEvents,
      averageDaysToFinalize,
      weatherPullsQuick: weatherQuick,
      weatherPullsFull: weatherFull,
      aiTokensUsed: totalAITokens,
      averageReportBuildTime,
    };
  } catch (error) {
    logger.error("[ReportMetrics] Failed to fetch metrics:", error);
    // Return zeros on error
    return {
      totalReports: 0,
      reportsThisMonth: 0,
      reportsFinalized: 0,
      reportsSubmitted: 0,
      pdfGenerations: 0,
      averageDaysToFinalize: null,
      weatherPullsQuick: 0,
      weatherPullsFull: 0,
      aiTokensUsed: 0,
      averageReportBuildTime: null,
    };
  }
}

/**
 * Track a report metric event
 * This can be extended to write to a dedicated metrics/events table
 */
export async function trackReportEvent(
  event: "created" | "finalized" | "submitted" | "pdf_generated",
  claimId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  orgId: string
): Promise<void> {
  try {
    // TODO: If you have a metrics table, log here
    // await prisma.report_metrics.create({
    //   data: {
    //     event,
    //     claimId,
    //     orgId,
    //     timestamp: new Date(),
    //   },
    // });

    logger.debug(`[ReportMetrics] Tracked ${event} for claim ${claimId}`);
  } catch (error) {
    logger.error("[ReportMetrics] Failed to track event:", error);
    // Don't throw - metrics should never block main flow
  }
}

/**
 * Get report activity breakdown for a time period
 */
export async function getReportActivityBreakdown(
  orgId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  created: number;
  finalized: number;
  submitted: number;
  pdfs: number;
}> {
  try {
    // Use raw queries for counts
    const [createdResult] = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int as count
      FROM claim_reports cr
      INNER JOIN claims c ON cr."claimId" = c.id
      WHERE c."orgId" = ${orgId}
        AND cr."createdAt" >= ${startDate}
        AND cr."createdAt" <= ${endDate}
    `;

    const [finalizedResult] = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int as count
      FROM claim_reports cr
      INNER JOIN claims c ON cr."claimId" = c.id
      WHERE c."orgId" = ${orgId}
        AND cr."finalizedAt" IS NOT NULL
        AND cr."finalizedAt" >= ${startDate}
        AND cr."finalizedAt" <= ${endDate}
    `;

    const [submittedResult] = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int as count
      FROM claim_reports cr
      INNER JOIN claims c ON cr."claimId" = c.id
      WHERE c."orgId" = ${orgId}
        AND cr."submittedAt" IS NOT NULL
        AND cr."submittedAt" >= ${startDate}
        AND cr."submittedAt" <= ${endDate}
    `;

    const [pdfsResult] = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int as count
      FROM claim_timeline_events cte
      INNER JOIN claims c ON cte.claim_id = c.id
      WHERE c."orgId" = ${orgId}
        AND cte.type = 'REPORT_PDF_GENERATED'
        AND cte.created_at >= ${startDate}
        AND cte.created_at <= ${endDate}
    `;

    return {
      created: Number(createdResult?.count || 0),
      finalized: Number(finalizedResult?.count || 0),
      submitted: Number(submittedResult?.count || 0),
      pdfs: Number(pdfsResult?.count || 0),
    };
  } catch (error) {
    logger.error("[ReportMetrics] Failed to get activity breakdown:", error);
    return { created: 0, finalized: 0, submitted: 0, pdfs: 0 };
  }
}
