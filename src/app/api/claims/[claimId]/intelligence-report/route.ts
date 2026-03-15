/**
 * Intelligence Report API — Generate AI-powered claim reports
 *
 * POST /api/claims/[claimId]/intelligence-report
 *
 * Uses the Report Builder engine + Dataset Builders to generate
 * structured reports in various formats (QUICK, CLAIMS_READY, RETAIL, FORENSIC).
 */

import { apiError } from "@/lib/apiError";
import { runIntelligenceReportBuilder } from "@/lib/intelligence/report-builder";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const bodySchema = z.object({
  type: z.enum(["QUICK", "CLAIMS_READY", "RETAIL", "FORENSIC"]).default("QUICK"),
  features: z
    .object({
      supplementSummary: z.boolean().optional(),
      materialComparison: z.boolean().optional(),
      weatherNarrative: z.boolean().optional(),
      carrierPlaybook: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  const ctx = await safeOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit AI-heavy endpoint
  const rl = await checkRateLimit(ctx.userId ?? ctx.orgId, "AI");
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before generating another report." },
      { status: 429 }
    );
  }

  const { claimId } = await params;

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", parsed.error.message);
    }

    const { type, features } = parsed.data;

    // Generate the report using the unified builder
    const report = await runIntelligenceReportBuilder({
      claimId,
      orgId: ctx.orgId,
      userId: ctx.userId,
      reportType: type,
      featureOverrides: features,
    });

    return NextResponse.json({
      report,
      type,
      claimId,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("[INTELLIGENCE_REPORT_API] Failed:", err);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
