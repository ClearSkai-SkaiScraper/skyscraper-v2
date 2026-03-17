export const dynamic = "force-dynamic";

/**
 * Claims Folder Readiness Score API
 * GET /api/claims-folder/score?claimId=xxx
 * Returns the readiness score for a claim without full assembly
 */

import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import {
  calculateReadinessScore,
  fetchClaimData,
  fetchCodeData,
  fetchPhotos,
  fetchScopeData,
  fetchTimeline,
  fetchWeatherData,
} from "@/lib/claims-folder/folderAssembler";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { orgId } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get("claimId");

    if (!claimId) {
      return NextResponse.json({ success: false, error: "claimId is required" }, { status: 400 });
    }

    // Verify claim belongs to this org
    await getOrgClaimOrThrow(orgId, claimId);

    // Fetch all data in parallel for scoring
    const [weatherData, { coverSheet, inspection }, photos, codeData, scopeData, timeline] =
      await Promise.all([
        fetchWeatherData(claimId),
        fetchClaimData(claimId),
        fetchPhotos(claimId),
        fetchCodeData(claimId),
        fetchScopeData(claimId),
        fetchTimeline(claimId),
      ]);

    if (!coverSheet) {
      return NextResponse.json({ success: false, error: "Claim not found" }, { status: 404 });
    }

    // Build partial folder for scoring
    const partialFolder = {
      coverSheet,
      weatherCauseOfLoss: weatherData || undefined,
      inspectionOverview: inspection || undefined,
      photos,
      codeCompliance: codeData || undefined,
      scopePricing: scopeData || undefined,
      timeline,
      signatures: [],
    };

    // Calculate score
    const score = calculateReadinessScore(partialFolder);

    return NextResponse.json({
      success: true,
      claimId,
      score: score.overall,
      grade: score.grade,
      breakdown: {
        weather: score.weather,
        photos: score.photos,
        codes: score.codes,
        scope: score.scope,
        narratives: score.narratives,
        signatures: score.signatures,
        timeline: score.timeline,
      },
      recommendation: score.recommendation,
    });
  } catch (error) {
    if (error instanceof OrgScopeError) {
      return NextResponse.json({ success: false, error: "Claim not found" }, { status: 404 });
    }
    logger.error("Error calculating readiness score:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
