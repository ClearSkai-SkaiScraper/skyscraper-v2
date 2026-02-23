// app/api/intel/material-forensics/route.ts
// 🧬 MATERIAL FORENSICS API — Generate engineering-grade material failure analysis

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { getDelegate } from "@/lib/db/modelAliases";
import {
  analyzeMaterialForensics,
  calculateOverallFailureProbability,
  getPrimaryFailureMode,
  type MaterialForensicsInput,
} from "@/lib/intel/forensics/materials";
import prisma from "@/lib/prisma";

/**
 * POST /api/intel/material-forensics
 *
 * Generates forensic material analysis for a claim
 *
 * Body:
 * {
 *   claim_id: string
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   forensicId: string,
 *   data: MaterialForensicsOutput
 * }
 */
export const POST = withAuth(async (req, { orgId, userId }) => {
  try {
    // Parse request
    const { claimId } = await req.json();

    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 });
    }

    // Fetch claim with all related data for forensic analysis — scoped to org
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      include: {
        properties: true,
        damage_assessments: {
          orderBy: { created_at: "desc" },
          take: 1,
        },
        weather_reports: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        estimates: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        inspections: {
          orderBy: { completedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Build forensics input
    const materialType = claim.properties?.roofType || "Unknown";
    const propertyAge = claim.properties?.roofAge || undefined;
    const inspectionNotes = claim.inspections[0]?.notes || undefined;

    const forensicsInput: MaterialForensicsInput = {
      materialType,
      propertyAge,
      damage: claim.damage_assessments[0] || null,
      weather: claim.weather_reports[0]?.globalSummary || claim.weather_reports[0]?.events || null,
      specs: null, // NOTE: Add manufacturer specs relation when table available
      codes: null, // NOTE: Add building codes relation when table available
      inspectionNotes,
      photos: [], // NOTE: Add photos from file_assets when available
    };

    // Generate forensic analysis
    logger.debug("🧬 Generating material forensics for claim:", claimId);
    const forensicData = await analyzeMaterialForensics(forensicsInput);

    // Calculate derived metrics
    const overallScore = calculateOverallFailureProbability(forensicData);
    const primaryMode = getPrimaryFailureMode(forensicData);

    // Save to database — uses DB-backed orgId
    const saved = await getDelegate("materialForensicReport").create({
      data: {
        claimId,
        orgId,
        createdById: userId,
        materialType,
        propertyAge,
        payload: forensicData as unknown as Record<string, unknown>, // JSON type
        overallFailureScore: overallScore,
        primaryFailureMode: primaryMode.mode,
        replacementJustified: overallScore >= 60, // 60%+ threshold
      },
    });

    logger.debug("✅ Material forensics saved:", saved.id);

    return NextResponse.json({
      success: true,
      forensicId: saved.id,
      data: forensicData,
      metrics: {
        overallScore,
        primaryMode: primaryMode.mode,
        primaryScore: primaryMode.score,
      },
    });
  } catch (err) {
    logger.error("❌ MATERIAL FORENSICS ERROR:", err);
    return NextResponse.json(
      {
        error: "Material forensics generation failed",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});

/**
 * GET /api/intel/material-forensics?claimId={claimId}
 *
 * Retrieves existing forensic analysis for a claim
 */
export const GET = withAuth(async (req, { orgId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get("claimId");

    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 });
    }

    // Fetch most recent forensic report for claim — scoped to DB-backed orgId
    const report = await getDelegate("materialForensicReport").findFirst({
      where: {
        claimId,
        orgId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        claim: {
          select: {
            claimNumber: true,
            title: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "No forensic report found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (err) {
    logger.error("❌ FORENSIC FETCH ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch forensic report" }, { status: 500 });
  }
});
