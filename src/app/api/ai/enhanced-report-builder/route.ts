export const dynamic = "force-dynamic";
/**
 * Enhanced Report Builder API
 *
 * POST /api/ai/enhanced-report-builder
 *
 * Generates comprehensive 20-40 page professional branded PDF reports.
 * Orchestrates: Storm Intake → Weather → Photos → Materials → Compliance → PDF
 */

import { NextRequest, NextResponse } from "next/server";

import { annotatePhotos } from "@/lib/ai/photo-annotator";
import { runStormIntakePipeline } from "@/lib/ai/pipelines/stormIntake";
import { createAiConfig, withAiBilling } from "@/lib/ai/withAiBilling";
import { checkCompliance } from "@/lib/compliance/code-checker";
import { fetchWeatherForDOL } from "@/lib/integrations/weather";
import { logger } from "@/lib/logger";
import { getRecommendedProducts } from "@/lib/materials/vendor-catalog";
import type { EnhancedReportData } from "@/lib/pdf/enhancedReportBuilder";
import { generateEnhancedPDFReport } from "@/lib/pdf/enhancedReportBuilder";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { enhancedReportBuilderSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

async function POST_INNER(req: NextRequest, ctx: { userId: string; orgId: string }) {
  try {
    const { userId, orgId: clerkOrgId } = ctx;

    // Rate limit: AI tier (5/min)
    const rl = await checkRateLimit(userId, "AI");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many AI requests. Please wait." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validated = validateAIRequest(enhancedReportBuilderSchema, body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error, details: validated.details },
        { status: 422 }
      );
    }

    const { claimId, options } = validated.data;

    // Resolve Clerk orgId → internal UUID for DB comparisons
    let internalOrgId = clerkOrgId;
    if (clerkOrgId) {
      const org = await prisma.org.findUnique({
        where: { clerkOrgId },
        select: { id: true },
      });
      if (org) internalOrgId = org.id;
    }

    // 1. FETCH CLAIM DETAILS
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      include: {
        properties: true,
      },
    });

    // Fetch photos separately using FileAsset
    const photos = await prisma.file_assets.findMany({
      where: { claimId, category: "photo" },
      take: 20,
    });

    // Fetch homeowner contact from clientLinks if available
    const clientLink = await prisma.claimClientLink.findFirst({
      where: { claimId },
    });

    if (!claim || claim.orgId !== internalOrgId) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 });
    }

    const property = claim.properties;
    const homeowner = clientLink;

    if (!property) {
      return NextResponse.json({ error: "Property information required" }, { status: 400 });
    }

    if (photos.length === 0) {
      return NextResponse.json({ error: "No photos found for this claim" }, { status: 400 });
    }

    // 2. RUN STORM INTAKE PIPELINE
    const photoUrls = photos.map((p) => p.publicUrl);
    const analysisResult = await runStormIntakePipeline({
      images: photoUrls,
      claimId,
      orgId: internalOrgId,
      propertyAddress: property.street,
      lossDate: claim.dateOfLoss,
      damageType: claim.damageType,
    });

    if (!analysisResult.success) {
      return NextResponse.json(
        { error: "AI analysis failed", details: analysisResult.error },
        { status: 500 }
      );
    }

    const analysis = analysisResult.results!;

    // 3. FETCH WEATHER DATA (if enabled)
    let weatherData;
    if (options?.includeWeather !== false && claim.dateOfLoss) {
      // fetchWeatherForDOL returns WeatherData | null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lat = (property as any).latitude || (property as any).lat || 33.4484; // Default to Phoenix AZ
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lng = (property as any).longitude || (property as any).lng || -112.074;
      const weatherResult = await fetchWeatherForDOL(lat, lng, claim.dateOfLoss);

      if (weatherResult) {
        weatherData = weatherResult;
      }
    }

    // 4. ANNOTATE PHOTOS (if enabled)
    let annotatedPhotos;
    if (options?.includeAnnotations !== false) {
      const photoData = photos.map((p) => ({ id: p.id, url: p.publicUrl }));
      const annotationResult = await annotatePhotos(photoData);

      if (annotationResult.success) {
        annotatedPhotos = annotationResult.data;
      }
    }

    // 5. CHECK CODE COMPLIANCE (if enabled)
    let complianceReport;
    if (options?.includeCompliance !== false && property.yearBuilt) {
      const complianceResult = await checkCompliance(
        property.state,
        property.city,
        claim.damageType
      );

      if (complianceResult.compliant !== undefined) {
        complianceReport = complianceResult;
      }
    }

    // 6. GET MATERIAL RECOMMENDATIONS (if enabled)
    let recommendedMaterials;
    if (options?.includeMaterials !== false) {
      recommendedMaterials = getRecommendedProducts({
        damageType: analysis.summary.primaryDamageType as "hail" | "wind",
        budget: "standard",
        impactResistance: analysis.summary.primaryDamageType === "hail",
      });
    }

    // 7. FETCH COMPANY BRANDING
    let branding;
    if (clerkOrgId) {
      const org = await prisma.org.findUnique({
        where: { clerkOrgId },
      });
      const orgBranding = await prisma.org_branding.findFirst({
        where: { orgId: org?.id },
      });

      if (org) {
        branding = {
          companyName: orgBranding?.companyName || org.name,
          logo: orgBranding?.logoUrl || org.brandLogoUrl,
          primaryColor: orgBranding?.colorPrimary || "#2563eb",
          secondaryColor: orgBranding?.colorAccent || "#64748b",
          phone: orgBranding?.phone || undefined,
          email: orgBranding?.email || undefined,
          website: orgBranding?.website || undefined,
          licenseNumber: orgBranding?.license || undefined,
        };
      }
    }

    // 8. ASSEMBLE ENHANCED REPORT DATA
    const reportData: EnhancedReportData = {
      claimId: claim.id,
      claimNumber: claim.claimNumber || undefined,
      dateOfLoss: claim.dateOfLoss!,
      property: {
        address: property.street,
        city: property.city,
        state: property.state,
        zip: property.zipCode,
        yearBuilt: property.yearBuilt || undefined,
        stories: undefined, // properties table doesn't have stories
      },
      homeowner: {
        name: homeowner?.clientName || claim.insured_name || "Homeowner",
        email: homeowner?.clientEmail || claim.homeowner_email || undefined,
        phone: undefined, // ClaimClientLink doesn't store phone
      },
      analysis,
      weatherData,
      annotatedPhotos,
      complianceReport,
      recommendedMaterials: recommendedMaterials?.slice(0, 3), // Top 3
      branding,
      generatedAt: new Date(),
      generatedBy: userId,
      reportVersion: "2.0-Enhanced",
    };

    // 9. GENERATE COMPREHENSIVE PDF
    const pdfBuffer = await generateEnhancedPDFReport(reportData);

    // 10. SAVE REPORT TO DATABASE
    const reportId = crypto.randomUUID();
    try {
      await prisma.reports.create({
        data: {
          id: reportId,
          orgId: claim.orgId,
          claimId: claim.id,
          createdById: userId,
          type: "enhanced_damage_report",
          title: `Comprehensive Damage Report - ${claim.claimNumber || claimId}`,
          subtitle: `Generated ${new Date().toLocaleDateString()}`,
          lossType: claim.damageType,
          dol: claim.dateOfLoss,
          address: property.street,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sections: reportData as any,
          summary: {
            photoCount: photos.length,
            hasWeather: !!weatherData,
            hasCompliance: !!complianceReport,
            hasMaterials: !!recommendedMaterials,
            version: "2.0-Enhanced",
          },
          updatedAt: new Date(),
        },
      });
      logger.info(`[Enhanced Report Builder] Report saved: ${reportId} for claim ${claimId}`);
    } catch (saveErr) {
      logger.error("[Enhanced Report Builder] Failed to save report record:", saveErr);
      // Don't block PDF delivery if save fails
    }

    // 11. RETURN PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Comprehensive-Damage-Report-${claim.claimNumber || claimId}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error("[Enhanced Report Builder] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate enhanced report",
        details: "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const POST = withAiBilling(
  createAiConfig("enhanced_report", { costPerRequest: 40, planRequired: "pro" }),
  async (req: NextRequest, ctx) => POST_INNER(req, { userId: ctx.userId, orgId: ctx.orgId || "" })
);
