import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/v1/property-profiles/[id] — Update property profile details
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Try to update property_profiles first
    const profile = await prisma.property_profiles
      .findFirst({
        where: { OR: [{ id }, { propertyId: id }] },
      })
      .catch(() => null);

    if (profile) {
      const updated = await prisma.property_profiles.update({
        where: { id: profile.id },
        data: {
          yearBuilt: body.yearBuilt,
          squareFootage: body.squareFootage,
          roofType: body.roofType,
          roofAge: body.roofAge,
          hvacAge: body.hvacAge,
          waterHeaterAge: body.waterHeaterAge,
          numStories: body.stories ?? body.numStories,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, property: updated });
    }

    // Fallback: try properties table
    const basicProperty = await prisma.properties.findUnique({ where: { id } }).catch(() => null);

    if (basicProperty) {
      // Create a property_profile for this property
      const newProfile = await prisma.property_profiles.create({
        data: {
          id: createId(),
          propertyId: id,
          orgId: ctx.orgId,
          fullAddress:
            `${basicProperty.street || ""}, ${basicProperty.city || ""}, ${basicProperty.state || ""} ${basicProperty.zipCode || ""}`.trim(),
          streetAddress: basicProperty.street || "",
          city: basicProperty.city || "",
          state: basicProperty.state || "",
          zipCode: basicProperty.zipCode || "",
          updatedAt: new Date(),
          yearBuilt: body.yearBuilt,
          squareFootage: body.squareFootage,
          roofType: body.roofType,
          roofAge: body.roofAge,
          hvacAge: body.hvacAge,
          waterHeaterAge: body.waterHeaterAge,
          numStories: body.stories ?? body.numStories,
        },
      });

      return NextResponse.json({ success: true, property: newProfile });
    }

    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  } catch (error) {
    logger.error("[PROPERTY_PROFILE_PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/v1/property-profiles/[id]/health-score — Calculate health score
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Return a calculated health score based on property data
    const profile = await prisma.property_profiles
      .findFirst({
        where: { OR: [{ id }, { propertyId: id }] },
      })
      .catch(() => null);

    if (!profile) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Simple health score calculation
    let overallScore = 70;
    const roofAge = profile.roofAge || 0;
    const hvacAge = profile.hvacAge || 0;

    if (roofAge > 20) overallScore -= 20;
    else if (roofAge > 15) overallScore -= 10;
    if (hvacAge > 15) overallScore -= 15;
    else if (hvacAge > 10) overallScore -= 5;

    const healthScore = {
      overallScore: Math.max(0, Math.min(100, overallScore)),
      grade: overallScore >= 80 ? "A" : overallScore >= 60 ? "B" : overallScore >= 40 ? "C" : "D",
      roofIntegrityScore: Math.max(0, 100 - roofAge * 3),
      hvacEfficiencyScore: Math.max(0, 100 - hvacAge * 4),
      systemConditionScore: 75,
      maintenanceScore: 70,
      structuralRiskScore: 80,
      ageScore: profile.yearBuilt
        ? Math.max(0, 100 - (new Date().getFullYear() - profile.yearBuilt) * 0.5)
        : 50,
      createdAt: new Date().toISOString(),
      criticalIssues: [],
    };

    return NextResponse.json({ success: true, healthScore });
  } catch (error) {
    logger.error("[PROPERTY_HEALTH_SCORE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
