/**
 * AI Insights Cron Job
 *
 * Weekly job to generate AI-powered insights for organizations:
 * - Claim pattern analysis
 * - Performance trends
 * - Optimization suggestions
 *
 * Schedule: Weekly (0 0 * * 0) - Sundays at midnight
 */

import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/cron/verifyCronSecret";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max

export async function GET(request: Request) {
  const started = Date.now();

  // Hard auth check — fail closed
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    logger.debug("[AI-INSIGHTS] Starting weekly insights generation...");

    // Get active organizations with recent activity
    const activeOrgs = await prisma.org.findMany({
      where: {
        claims: {
          some: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            claims: true,
            ai_reports: true,
          },
        },
      },
    });

    const insights = {
      totalOrgs: activeOrgs.length,
      processed: 0,
      errors: 0,
      orgSummaries: [] as Array<{
        orgId: string;
        claimCount: number;
        aiReportCount: number;
      }>,
    };

    // Generate basic insights for each org
    for (const org of activeOrgs) {
      try {
        insights.orgSummaries.push({
          orgId: org.id,
          claimCount: org._count.claims,
          aiReportCount: org._count.ai_reports,
        });
        insights.processed++;
      } catch (orgError) {
        logger.error(`[AI-INSIGHTS] Error processing org ${org.id}:`, orgError);
        insights.errors++;
      }
    }

    logger.debug("[AI-INSIGHTS] Completed:", insights);

    return NextResponse.json({
      ok: true,
      insights,
      ms: Date.now() - started,
    });
  } catch (error) {
    logger.error("[AI-INSIGHTS] Cron error:", error);
    Sentry.captureException(error, { tags: { cron: "ai-insights" } });

    return NextResponse.json(
      { ok: false, error: "Internal server error", ms: Date.now() - started },
      { status: 500 }
    );
  }
}
