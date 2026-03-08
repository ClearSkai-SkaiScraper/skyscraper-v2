export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

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

    if (!forceRefresh) {
      const existing = await prisma.claim_bad_faith_analysis
        .findUnique({ where: { claim_id: claimId } })
        .catch(() => null);
      if (existing) {
        return NextResponse.json(existing);
      }
    }

    const carrier = claim.carrier || "Unknown Carrier";
    const daysSinceLoss = claim.dateOfLoss
      ? Math.floor((Date.now() - new Date(claim.dateOfLoss).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const estimateTotal =
      claim.estimates?.reduce((sum: number, e: any) => sum + (e.total || 0), 0) || 0;
    const supplementCount = claim.supplements?.length || 0;

    const analysis = {
      claimId,
      carrier,
      riskLevel: "low" as string,
      overallScore: 25,
      daysSinceLoss,
      estimateTotal,
      supplementCount,
      indicators: [] as { indicator: string; severity: string; details: string }[],
      recommendations: [
        "Continue documenting all communications with the carrier",
        "Ensure all supplemental estimates are submitted in writing",
        "Keep records of all response timelines from the carrier",
      ],
      analyzedAt: new Date().toISOString(),
    };

    if (daysSinceLoss && daysSinceLoss > 60) {
      analysis.indicators.push({
        indicator: "Extended timeline",
        severity: "medium",
        details: daysSinceLoss + " days since loss",
      });
      analysis.overallScore += 15;
    }

    if (supplementCount > 2) {
      analysis.indicators.push({
        indicator: "Multiple supplements",
        severity: "low",
        details: supplementCount + " supplements filed",
      });
      analysis.overallScore += 10;
    }

    if (analysis.overallScore > 60) analysis.riskLevel = "high";
    else if (analysis.overallScore > 35) analysis.riskLevel = "medium";

    logger.info("Bad-faith analysis complete for " + claimId);

    return NextResponse.json(analysis);
  } catch (error) {
    logger.error("Bad-faith analysis error:", error);
    return NextResponse.json(
      { error: "Bad faith analysis failed" },
      { status: 500 }
    );
  }
}
