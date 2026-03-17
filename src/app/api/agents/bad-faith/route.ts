export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { saveReportHistory } from "@/lib/reports/saveReportHistory";

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { claimId, forceRefresh } = body;

    if (!claimId) {
      return NextResponse.json({ error: "Claim ID is required" }, { status: 400 });
    }

    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      include: {
        properties: true,
        estimates: true,
        supplements: true,
        weather_reports: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Check for cached analysis (7-day cache)
    if (!forceRefresh) {
      const existing = await prisma.claim_bad_faith_analysis
        .findUnique({ where: { claim_id: claimId } })
        .catch(() => null);
      if (existing) {
        // Transform DB format to response format
        const cached = (existing.analysis as Record<string, any>) || {};
        const cachedIndicators = cached.indicators || [];
        const cachedSeverity = cached.overallSeverity || "none";
        const cachedResult = {
          hasBadFaithIndicators: cachedIndicators.length > 0,
          indicators: cachedIndicators,
          overallSeverity: cachedSeverity,
          legalActionRecommended: cachedSeverity === "critical" || cachedSeverity === "high",
          attorneyReferralSuggested: cachedSeverity === "high" || cachedSeverity === "medium",
          summary: cached.summary || "Analysis loaded from cache.",
        };
        return NextResponse.json(cachedResult);
      }
    }

    const carrier = claim.carrier || "Unknown Carrier";
    const daysSinceLoss = claim.dateOfLoss
      ? Math.floor((Date.now() - new Date(claim.dateOfLoss).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const estimateTotal =
      claim.estimates?.reduce((sum: number, e: any) => sum + (e.total || 0), 0) || 0;
    const supplementCount = claim.supplements?.length || 0;

    // Build indicators array
    const indicators: any[] = [];
    let overallScore = 25;

    if (daysSinceLoss && daysSinceLoss > 90) {
      indicators.push({
        type: "extended_timeline",
        severity: "high",
        description: `Claim has been open for ${daysSinceLoss} days without resolution`,
        evidence: [`Date of loss: ${claim.dateOfLoss}`, `Days elapsed: ${daysSinceLoss}`],
        detectedAt: new Date().toISOString(),
        legalBasis:
          "Unreasonable delay in claims handling may constitute bad faith under state insurance regulations",
        recommendedAction:
          "Document all carrier communication delays and send a formal demand letter",
      });
      overallScore += 25;
    } else if (daysSinceLoss && daysSinceLoss > 60) {
      indicators.push({
        type: "extended_timeline",
        severity: "medium",
        description: `Claim has been open for ${daysSinceLoss} days`,
        evidence: [`Days since loss: ${daysSinceLoss}`],
        detectedAt: new Date().toISOString(),
        recommendedAction: "Monitor carrier response times closely",
      });
      overallScore += 15;
    }

    if (supplementCount > 3) {
      indicators.push({
        type: "multiple_supplements",
        severity: "medium",
        description: `${supplementCount} supplements have been filed, suggesting initial estimate inadequacy`,
        evidence: [`Number of supplements: ${supplementCount}`],
        detectedAt: new Date().toISOString(),
        legalBasis: "Systematic undervaluation of claims may indicate bad faith practices",
        recommendedAction: "Request detailed justification for initial estimate methodology",
      });
      overallScore += 15;
    } else if (supplementCount > 1) {
      indicators.push({
        type: "multiple_supplements",
        severity: "low",
        description: `${supplementCount} supplements filed`,
        evidence: [`Supplement count: ${supplementCount}`],
        detectedAt: new Date().toISOString(),
        recommendedAction: "Continue documenting all supplement submissions",
      });
      overallScore += 10;
    }

    // Determine overall severity
    let overallSeverity: "none" | "low" | "medium" | "high" | "critical" = "none";
    if (overallScore >= 80) overallSeverity = "critical";
    else if (overallScore >= 60) overallSeverity = "high";
    else if (overallScore >= 40) overallSeverity = "medium";
    else if (overallScore >= 25) overallSeverity = "low";

    const summary =
      indicators.length > 0
        ? `Analysis detected ${indicators.length} potential bad faith indicator(s) for claim against ${carrier}. Overall risk assessment: ${overallSeverity.toUpperCase()}.`
        : `No significant bad faith indicators detected for this claim against ${carrier}. Continue standard documentation practices.`;

    const result = {
      hasBadFaithIndicators: indicators.length > 0,
      indicators,
      overallSeverity,
      legalActionRecommended: overallSeverity === "critical" || overallSeverity === "high",
      attorneyReferralSuggested: overallSeverity === "high" || overallSeverity === "medium",
      summary,
    };

    // Save analysis to database for caching
    try {
      await prisma.claim_bad_faith_analysis.upsert({
        where: { claim_id: claimId },
        create: {
          id: `bf-${claimId}-${Date.now()}`,
          claim_id: claimId,
          severity: typeof overallSeverity === "number" ? overallSeverity : indicators.length,
          analysis: {
            overallSeverity,
            summary,
            indicators,
            analyzedAt: new Date().toISOString(),
          },
        },
        update: {
          severity: typeof overallSeverity === "number" ? overallSeverity : indicators.length,
          analysis: {
            overallSeverity,
            summary,
            indicators,
            analyzedAt: new Date().toISOString(),
          },
        },
      });
      logger.info("[BAD_FAITH_ANALYSIS] Saved to database", { claimId, severity: overallSeverity });
    } catch (saveError) {
      logger.error("[BAD_FAITH_ANALYSIS] Failed to save to DB (non-critical)", saveError);
    }

    // Also save to ai_reports for report history
    try {
      await prisma.ai_reports.create({
        data: {
          id: `bad-faith-${claimId}-${Date.now()}`,
          orgId: orgId || claim.orgId,
          claimId,
          userId,
          userName: "Bad Faith Detector",
          type: "bad_faith_analysis",
          title: `Bad Faith Analysis - ${claim.claimNumber || claimId}`,
          content: JSON.stringify(result),
          tokensUsed: 0,
          status: "generated",
          updatedAt: new Date(),
        },
      });
    } catch (reportError) {
      logger.error("[BAD_FAITH_ANALYSIS] Failed to save to ai_reports", reportError);
    }

    logger.info("[BAD_FAITH_ANALYSIS] Complete", {
      claimId,
      severity: overallSeverity,
      indicatorCount: indicators.length,
    });

    // ── Save to report_history for Reports History page ──
    await saveReportHistory({
      orgId: orgId || claim.orgId,
      userId,
      type: "bad_faith",
      title: `Bad Faith Analysis — ${claim.claimNumber || claimId}`,
      sourceId: claimId,
      fileUrl: null,
      metadata: {
        severity: overallSeverity,
        indicatorCount: indicators.length,
        claimNumber: claim.claimNumber,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[BAD_FAITH_ANALYSIS] Error:", error);
    return NextResponse.json({ error: "Bad faith analysis failed" }, { status: 500 });
  }
}
