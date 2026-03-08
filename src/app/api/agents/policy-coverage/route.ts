export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { claimId } = body;

    if (!claimId) {
      return NextResponse.json({ error: "Claim ID is required" }, { status: 400 });
    }

    // Fetch claim with policy info and related data
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      include: {
        properties: true,
        estimates: true,
        weather_reports: true,
        supplements: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Extract policy information from claim
    const policyNumber = claim.policy_number;
    const carrier = claim.carrier;
    const deductible = claim.deductible || 1000;
    const estimatedValue = claim.estimatedValue || 0;
    const approvedValue = claim.approvedValue;

    // Analyze coverage based on claim data
    const hasWeatherVerification = claim.weather_reports && claim.weather_reports.length > 0;
    const hasEstimate = claim.estimates && claim.estimates.length > 0;
    const hasSupplements = claim.supplements && claim.supplements.length > 0;
    const damageType = claim.damageType || "unknown";

    // Determine coverage status based on available data
    const coverageIndicators = [
      hasWeatherVerification ? 20 : 0,
      hasEstimate ? 15 : 0,
      policyNumber ? 15 : -10,
      carrier ? 10 : 0,
      damageType !== "unknown" ? 10 : 0,
      claim.dateOfLoss ? 10 : -5,
    ];
    const coverageScore = 50 + coverageIndicators.reduce((a, b) => a + b, 0);
    const covered = coverageScore >= 60;
    const coveragePercentage = Math.min(100, Math.max(0, coverageScore));

    // Build exclusions based on damage type
    const exclusions: string[] = [];
    if (damageType.toLowerCase().includes("flood")) {
      exclusions.push("Flood damage may require separate flood insurance policy");
    }
    if (damageType.toLowerCase().includes("mold")) {
      exclusions.push("Mold damage may have coverage limitations");
    }
    if (!hasWeatherVerification) {
      exclusions.push("Weather verification pending - coverage subject to confirmation");
    }

    // Build risk flags
    const riskFlags: string[] = [];
    if (!policyNumber) {
      riskFlags.push("Policy number not on file - verify active coverage");
    }
    if (deductible && estimatedValue && deductible >= estimatedValue * 0.5) {
      riskFlags.push("Deductible may exceed 50% of estimated damage");
    }
    if (hasSupplements) {
      riskFlags.push("Supplements filed - additional review may be required");
    }

    // Generate recommendation
    let recommendation = "";
    if (covered && coveragePercentage >= 80) {
      recommendation = `Claim appears to be well-documented and covered under the ${damageType} peril provision. Recommend proceeding with documentation and adjuster assignment.`;
    } else if (covered) {
      recommendation =
        "Claim likely covered but additional documentation recommended. Consider obtaining weather verification and detailed estimates.";
    } else {
      recommendation =
        "Coverage uncertain. Review policy exclusions and obtain missing documentation before proceeding.";
    }

    const result = {
      claimId,
      covered,
      coveragePercentage,
      policyLimits: {
        dwelling: approvedValue || estimatedValue || 350000,
        deductible,
        carrier: carrier || "Unknown",
        policyNumber: policyNumber || "Not on file",
      },
      exclusions,
      riskFlags,
      recommendation,
      claimDetails: {
        damageType,
        dateOfLoss: claim.dateOfLoss?.toISOString().split("T")[0],
        hasWeatherVerification,
        hasEstimate,
        hasSupplements,
        estimatedValue,
        approvedValue,
      },
      analyzedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[policy-coverage] Error:", error);
    return NextResponse.json({ error: "Failed to analyze policy coverage" }, { status: 500 });
  }
}
