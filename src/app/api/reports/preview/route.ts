export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * POST /api/reports/preview
 *
 * Pre-flight validation before PDF generation.
 * Gathers all claim/template/org context and validates required fields.
 *
 * Accepts: { claimId, orgTemplateId }
 * Returns: { ok, mergedData, missingFields, mediaCount, weatherStatus, template }
 */

export const runtime = "nodejs";

export const POST = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const body = await req.json();
    const { claimId, orgTemplateId } = body;

    if (!claimId) {
      return NextResponse.json({ ok: false, error: "CLAIM_ID_REQUIRED" }, { status: 400 });
    }

    // ── 1. Claim + Property ──────────────────────────────────────────────
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      include: { properties: true },
    });

    if (!claim) {
      return NextResponse.json(
        { ok: false, error: "Claim not found in your organization" },
        { status: 404 }
      );
    }

    // ── 2. Org branding ──────────────────────────────────────────────────
    const [org, branding] = await Promise.all([
      prisma.org.findUnique({
        where: { id: orgId },
        select: {
          name: true,
          brandLogoUrl: true,
          pdfFooterText: true,
          pdfHeaderText: true,
        },
      }),
      prisma.org_branding.findUnique({
        where: { orgId },
        select: {
          companyName: true,
          logoUrl: true,
          phone: true,
          email: true,
          website: true,
          license: true,
          colorPrimary: true,
          colorAccent: true,
          teamPhotoUrl: true,
        },
      }),
    ]);

    // ── 3. Resolve template ──────────────────────────────────────────────
    let templateInfo: { title: string; sections: any } = { title: "Default Report", sections: [] };
    if (orgTemplateId) {
      const orgTemplate = await prisma.orgTemplate.findFirst({
        where: { id: orgTemplateId, orgId },
        include: { Template: true },
      });
      if (orgTemplate?.Template) {
        templateInfo = {
          title: orgTemplate.customName || orgTemplate.Template.name,
          sections: orgTemplate.Template.sections || [],
        };
      }
    }

    // ── 4. Media (file assets) ───────────────────────────────────────────
    let media: {
      id: string;
      filename: string;
      publicUrl: string;
      category: string;
      mimeType: string;
    }[] = [];
    try {
      media = await prisma.file_assets.findMany({
        where: { claimId, orgId },
        select: { id: true, filename: true, publicUrl: true, category: true, mimeType: true },
      });
    } catch {
      // file_assets table may not exist yet
    }

    // ── 5. Damage assessments + findings ─────────────────────────────────
    let findings: any[] = [];
    try {
      const assessments = await prisma.damage_assessments.findMany({
        where: { claim_id: claimId, org_id: orgId },
        include: { damage_findings: true },
      });
      findings = assessments.flatMap((a) =>
        (a.damage_findings || []).map((f) => ({
          id: f.id,
          damageType: f.damage_type,
          severity: f.severity,
          description: f.description,
          location: f.location_facet,
          elevation: f.elevation,
          material: f.material,
          recommendedAction: f.recommended_action,
        }))
      );
    } catch {
      // damage tables may not exist yet
    }

    // ── 6. Weather ───────────────────────────────────────────────────────
    let weather: any = null;
    try {
      weather = await prisma.weather_reports.findFirst({
        where: { claimId },
        orderBy: { createdAt: "desc" },
        select: {
          overallAssessment: true,
          primaryPeril: true,
          confidence: true,
          events: true,
          candidateDates: true,
        },
      });
    } catch {
      // weather_reports may not be available
    }

    // ── 7. Scopes ────────────────────────────────────────────────────────
    let scopeData: any[] = [];
    try {
      const scopes = await prisma.scopes.findMany({
        where: { claim_id: claimId, org_id: orgId },
        include: { scope_areas: { include: { scope_items: true } } },
      });
      scopeData = scopes.map((s) => ({
        title: s.title,
        status: s.status,
        areas: (s.scope_areas || []).map((a) => ({
          name: a.name,
          items: (a.scope_items || []).map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unit: i.unit,
          })),
        })),
      }));
    } catch {
      // scopes may not exist
    }

    // ── Build merged data ────────────────────────────────────────────────
    const address = claim.properties
      ? [
          claim.properties.street,
          claim.properties.city,
          claim.properties.state,
          claim.properties.zipCode,
        ]
          .filter(Boolean)
          .join(", ")
      : null;

    const mergedData: Record<string, any> = {
      claim: {
        id: claim.id,
        claimNumber: claim.claimNumber,
        title: claim.title,
        description: claim.description,
        damageType: claim.damageType,
        dateOfLoss: claim.dateOfLoss,
        carrier: claim.carrier,
        status: claim.status,
        insuredName: claim.insured_name,
        policyNumber: claim.policy_number,
      },
      property: {
        address,
        street: claim.properties?.street || null,
        city: claim.properties?.city || null,
        state: claim.properties?.state || null,
        zipCode: claim.properties?.zipCode || null,
        roofType: claim.properties?.roofType || null,
        roofAge: claim.properties?.roofAge || null,
        yearBuilt: claim.properties?.yearBuilt || null,
        squareFootage: claim.properties?.squareFootage || null,
      },
      company: {
        name: branding?.companyName || org?.name || "Unknown",
        logo: branding?.logoUrl || org?.brandLogoUrl || null,
        logoUrl: branding?.logoUrl || org?.brandLogoUrl || null,
        headerText: org?.pdfHeaderText || null,
        footerText: org?.pdfFooterText || null,
        phone: branding?.phone || null,
        email: branding?.email || null,
        website: branding?.website || null,
        license: branding?.license || null,
        colorPrimary: branding?.colorPrimary || "#117CFF",
        colorAccent: branding?.colorAccent || "#FFC838",
        teamPhotoUrl: branding?.teamPhotoUrl || null,
      },
      weather: weather
        ? {
            assessment: weather.overallAssessment,
            primaryPeril: weather.primaryPeril,
            confidence: weather.confidence,
            events: weather.events,
          }
        : null,
      media: media.map((m) => ({
        id: m.id,
        filename: m.filename,
        url: m.publicUrl,
        category: m.category,
      })),
      findings,
      scopes: scopeData,
    };

    // ── Identify missing fields ──────────────────────────────────────────
    const missingFields: string[] = [];
    if (!mergedData.company.logo) missingFields.push("company.logo");
    if (!mergedData.company.phone) missingFields.push("company.phone");
    if (!mergedData.company.email) missingFields.push("company.email");
    if (!mergedData.weather) missingFields.push("weather");
    if (media.length === 0) missingFields.push("media.photos");
    if (findings.length === 0) missingFields.push("findings");
    if (!mergedData.claim.carrier) missingFields.push("claim.carrier");
    if (!mergedData.claim.insuredName) missingFields.push("claim.insuredName");
    if (!mergedData.property.roofType) missingFields.push("property.roofType");

    const photoCount = media.filter((m) => m.mimeType?.startsWith("image/")).length;

    return NextResponse.json({
      ok: true,
      mergedData,
      missingFields,
      mediaCount: photoCount,
      weatherStatus: weather ? "available" : "not_available",
      template: { title: templateInfo.title },
    });
  } catch (error) {
    logger.error("[PREVIEW] Error:", error);
    return NextResponse.json(
      { ok: false, error: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
});
