export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withAuth(async (request: NextRequest, { orgId, userId }) => {
  try {
    const body = await request.json();
    const { claimId } = body;

    if (!claimId) {
      return NextResponse.json({ error: "Claim ID is required" }, { status: 400 });
    }

    // Fetch claim with all related data for risk analysis
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      include: {
        properties: true,
        estimates: true,
        supplements: true,
        weather_reports: true,
        claim_activities: {
          orderBy: { created_at: "desc" },
          take: 20,
        },
        claim_bad_faith_analysis: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Type the included relations
    const claimWithRelations = claim as typeof claim & {
      weather_reports?: { id: string }[];
      estimates?: { id: string }[];
      supplements?: { id: string }[];
      claim_bad_faith_analysis?: { overall_score?: number } | null;
    };

    // Get photos count for documentation assessment
    const photoCount = await prisma.file_assets.count({
      where: {
        claimId,
        mimeType: { startsWith: "image/" },
      },
    });

    // Analyze risk factors based on real claim data
    const factors: { name: string; impact: "positive" | "negative"; weight: number }[] = [];

    // Documentation quality
    if (photoCount >= 20) {
      factors.push({
        name: "Comprehensive photo documentation (" + photoCount + " photos)",
        impact: "positive",
        weight: 15,
      });
    } else if (photoCount >= 10) {
      factors.push({
        name: "Adequate photo documentation (" + photoCount + " photos)",
        impact: "positive",
        weight: 8,
      });
    } else if (photoCount < 5) {
      factors.push({
        name: "Limited photo documentation (" + photoCount + " photos)",
        impact: "negative",
        weight: 12,
      });
    }

    // Weather verification
    const hasWeather =
      claimWithRelations.weather_reports && claimWithRelations.weather_reports.length > 0;
    if (hasWeather) {
      factors.push({ name: "Weather event verified by reports", impact: "positive", weight: 18 });
    } else {
      factors.push({ name: "Weather verification pending", impact: "negative", weight: 10 });
    }

    // Estimate status
    const hasEstimate = claimWithRelations.estimates && claimWithRelations.estimates.length > 0;
    if (hasEstimate) {
      factors.push({ name: "Contractor estimate on file", impact: "positive", weight: 12 });
    } else {
      factors.push({ name: "No estimate on file", impact: "negative", weight: 8 });
    }

    // Supplements - can indicate complications
    const supplementCount = claimWithRelations.supplements?.length || 0;
    if (supplementCount > 2) {
      factors.push({
        name: "Multiple supplements filed (" + supplementCount + ")",
        impact: "negative",
        weight: 10,
      });
    } else if (supplementCount === 1) {
      factors.push({ name: "Single supplement filed", impact: "negative", weight: 4 });
    }

    // Carrier response patterns
    const carrier = claim.carrier?.toLowerCase() || "";
    const knownDifficultCarriers = ["state farm", "allstate", "farmers"];
    if (knownDifficultCarriers.some((c) => carrier.includes(c))) {
      factors.push({ name: "Carrier with known dispute history", impact: "negative", weight: 12 });
    }

    // Claim age
    const claimAge = Math.floor(
      (Date.now() - new Date(claim.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (claimAge > 90) {
      factors.push({ name: "Claim open > 90 days", impact: "negative", weight: 8 });
    } else if (claimAge > 60) {
      factors.push({ name: "Claim open > 60 days", impact: "negative", weight: 5 });
    }

    // Claim amount analysis
    const estimatedValue = claim.estimatedValue || 0;
    const approvedValue = claim.approvedValue || 0;
    if (estimatedValue > 50000) {
      factors.push({
        name: "High value claim ($" + estimatedValue.toLocaleString() + ")",
        impact: "negative",
        weight: 7,
      });
    }
    if (approvedValue > 0 && approvedValue < estimatedValue * 0.7) {
      factors.push({ name: "Significant underpayment detected", impact: "negative", weight: 15 });
    }

    // Prior bad faith analysis
    if (claimWithRelations.claim_bad_faith_analysis) {
      const bfScore = claimWithRelations.claim_bad_faith_analysis.overall_score || 0;
      if (bfScore >= 70) {
        factors.push({
          name: "High bad faith indicators detected",
          impact: "negative",
          weight: 20,
        });
      } else if (bfScore >= 40) {
        factors.push({ name: "Moderate bad faith indicators", impact: "negative", weight: 10 });
      }
    }

    // Policy info completeness
    if (claim.policy_number && claim.carrier) {
      factors.push({ name: "Complete policy information on file", impact: "positive", weight: 8 });
    } else {
      factors.push({ name: "Incomplete policy information", impact: "negative", weight: 6 });
    }

    // Calculate overall risk score
    const baseScore = 35;
    const adjustment = factors.reduce((acc, f) => {
      return acc + (f.impact === "negative" ? f.weight : -f.weight / 2);
    }, 0);
    const overallScore = Math.min(100, Math.max(0, Math.round(baseScore + adjustment)));

    // Calculate specific risk percentages
    const litigationProbability = Math.min(
      95,
      Math.max(5, overallScore + (supplementCount > 1 ? 10 : 0))
    );
    const badFaithRisk = Math.min(
      90,
      Math.max(
        5,
        overallScore - 5 + (approvedValue > 0 && approvedValue < estimatedValue * 0.5 ? 15 : 0)
      )
    );
    const denialRisk = Math.min(85, Math.max(10, overallScore - 10 + (!hasWeather ? 10 : 0)));
    const supplementRisk = Math.min(80, Math.max(15, 30 + (hasEstimate ? 0 : 20) + claimAge / 5));

    // Generate recommendation
    let recommendation = "";
    if (overallScore < 30) {
      recommendation =
        "Low risk claim. Documentation is strong and claim appears well-supported. Proceed with standard processing.";
    } else if (overallScore < 50) {
      recommendation =
        "Moderate risk. Ensure all documentation is complete and monitor carrier responses. Maintain detailed communication logs.";
    } else if (overallScore < 70) {
      recommendation =
        "Elevated risk detected. Consider involving senior adjuster. Document all carrier interactions meticulously. Legal consultation may be warranted.";
    } else {
      recommendation =
        "High risk claim. Strong indicators suggest potential for denial or litigation. Recommend immediate legal review and aggressive documentation strategy.";
    }

    const result = {
      claimId,
      overallScore,
      litigationProbability,
      badFaithRisk,
      denialRisk,
      supplementRisk,
      factors,
      recommendation,
      claimMetrics: {
        ageInDays: claimAge,
        photoCount,
        supplementCount,
        estimatedValue,
        approvedValue,
        hasWeatherVerification: hasWeather,
        hasEstimate,
      },
      analyzedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[risk-scoring] Error:", error);
    return NextResponse.json({ error: "Failed to calculate risk score" }, { status: 500 });
  }
});
