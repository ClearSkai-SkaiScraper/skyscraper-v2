import { createId } from "@paralleldrive/cuid2";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

const INT_FIELDS = new Set([
  "squareFootage",
  "lotSize",
  "yearBuilt",
  "numBedrooms",
  "numStories",
  "garageSpaces",
  "roofAge",
  "hvacAge",
  "waterHeaterAge",
  "waterHeaterGallons",
  "plumbingAge",
  "electricalPanelAge",
  "foundationAge",
]);

const FLOAT_FIELDS = new Set([
  "numBathrooms",
  "roofSquares",
  "hvacTonnage",
  "latitude",
  "longitude",
]);

const BOOL_FIELDS = new Set([
  "hasGeneratorHookup",
  "hasSmartHome",
  "hasLowEWindows",
  "hasSolarPanels",
]);

const DATE_FIELDS = new Set([
  "lastRoofReplacement",
  "roofWarrantyExpires",
  "lastHvacService",
  "hvacWarrantyExpires",
  "lastWaterHeaterService",
  "solarInstallDate",
]);

const ALL_EDITABLE = [
  ...INT_FIELDS,
  ...FLOAT_FIELDS,
  ...BOOL_FIELDS,
  ...DATE_FIELDS,
  "foundationType",
  "roofType",
  "roofPitch",
  "roofColor",
  "hvacType",
  "hvacManufacturer",
  "hvacModel",
  "waterHeaterType",
  "waterHeaterFuel",
  "plumbingType",
  "sewerType",
  "waterSource",
  "electricalPanelType",
  "wiringType",
  "insulationRating",
  "windowType",
  "floodZone",
  "county",
];

function coerce(key: string, val: unknown): unknown {
  if (val === null || val === undefined || val === "") return null;
  if (INT_FIELDS.has(key)) return Math.round(Number(val)) || null;
  if (FLOAT_FIELDS.has(key)) return Number(val) || null;
  if (BOOL_FIELDS.has(key)) return val === true || val === "true";
  if (DATE_FIELDS.has(key)) {
    const d = new Date(val as string);
    return isNaN(d.getTime()) ? null : d;
  }
  return String(val);
}

/**
 * PATCH /api/v1/property-profiles/[id]
 * Accepts any subset of 40+ editable property fields.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Build data from known fields
    const data: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of ALL_EDITABLE) {
      // Accept "stories" from frontend → map to "numStories"
      const val = key === "numStories" ? (body.numStories ?? body.stories) : body[key];
      if (val !== undefined) {
        data[key] = coerce(key, val);
      }
    }

    const profile = await prisma.property_profiles
      .findFirst({ where: { orgId: ctx.orgId, OR: [{ id }, { propertyId: id }] } })
      .catch(() => null);

    if (profile) {
      const updated = await prisma.property_profiles.update({
        where: { id: profile.id },
        data,
      });
      return NextResponse.json({ success: true, property: updated });
    }

    // Fallback: create from properties table (still org-scoped)
    const basicProp = await prisma.properties
      .findFirst({ where: { id, orgId: ctx.orgId } })
      .catch(() => null);

    if (basicProp) {
      const addr = [basicProp.street, basicProp.city, basicProp.state, basicProp.zipCode]
        .filter(Boolean)
        .join(", ");
      const newProfile = await prisma.property_profiles.create({
        data: {
          id: createId(),
          propertyId: id,
          orgId: ctx.orgId,
          fullAddress: addr,
          streetAddress: basicProp.street || "",
          city: basicProp.city || "",
          state: basicProp.state || "",
          zipCode: basicProp.zipCode || "",
          updatedAt: new Date(),
          ...data,
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
 * POST /api/v1/property-profiles/[id] — Calculate health score
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const profile = await prisma.property_profiles
      .findFirst({ where: { orgId: ctx.orgId, OR: [{ id }, { propertyId: id }] } })
      .catch(() => null);

    if (!profile) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    let score = 70;
    const rAge = profile.roofAge || 0;
    const hAge = profile.hvacAge || 0;
    if (rAge > 20) score -= 20;
    else if (rAge > 15) score -= 10;
    if (hAge > 15) score -= 15;
    else if (hAge > 10) score -= 5;

    const overallScore = Math.max(0, Math.min(100, score));
    const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
    const roofIntegrityScore = Math.max(0, 100 - rAge * 3);
    const hvacEfficiencyScore = Math.max(0, 100 - hAge * 4);
    const ageScore = profile.yearBuilt
      ? Math.max(0, Math.round(100 - (new Date().getFullYear() - profile.yearBuilt) * 0.5))
      : 50;

    const healthScore = {
      overallScore,
      grade,
      roofIntegrityScore,
      hvacEfficiencyScore,
      systemConditionScore: 75,
      maintenanceScore: 70,
      structuralRiskScore: 80,
      ageScore,
      createdAt: new Date().toISOString(),
      criticalIssues: [] as { issue: string; severity: string }[],
    };

    // ── Persist to property_health_scores table ──
    try {
      // Find existing score for this profile to update, or create new
      const existingScore = await prisma.property_health_scores.findFirst({
        where: { propertyProfileId: profile.id, orgId: ctx.orgId },
        select: { id: true, overallScore: true },
      });

      const scoreData = {
        overallScore,
        grade,
        ageScore,
        maintenanceScore: 70,
        systemConditionScore: 75,
        claimsHistoryScore: 75,
        weatherExposureScore: 70,
        structuralRiskScore: 80,
        applianceHealthScore: 75,
        roofIntegrityScore,
        hvacEfficiencyScore,
        plumbingConditionScore: 75,
        electricalSafetyScore: 80,
        criticalIssues: [],
        previousScore: existingScore?.overallScore ?? null,
        scoreChange: existingScore ? overallScore - existingScore.overallScore : null,
        scoreChangedAt: existingScore ? new Date() : null,
        updatedAt: new Date(),
      };

      if (existingScore) {
        await prisma.property_health_scores.update({
          where: { id: existingScore.id },
          data: scoreData,
        });
      } else {
        await prisma.property_health_scores.create({
          data: {
            id: createId(),
            propertyProfileId: profile.id,
            orgId: ctx.orgId,
            ...scoreData,
          },
        });
      }
      logger.info("[PROPERTY_HEALTH_SCORE] Persisted", {
        profileId: profile.id,
        overallScore,
        grade,
      });
    } catch (persistErr) {
      // Non-fatal — score still returned even if persistence fails
      logger.warn("[PROPERTY_HEALTH_SCORE] Failed to persist:", persistErr);
    }

    return NextResponse.json({ success: true, healthScore });
  } catch (error) {
    logger.error("[PROPERTY_HEALTH_SCORE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
