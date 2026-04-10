export const dynamic = "force-dynamic";

// src/app/api/claims-folder/generate/executive-summary/route.ts
import { type NextRequest,NextResponse } from "next/server";
import { z } from "zod";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const RequestSchema = z.object({
  claimId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId } = auth;

    const body = await request.json();
    const { claimId } = RequestSchema.parse(body);

    // Fetch claim data with property + weather relations — org-scoped
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      include: {
        properties: true,
        weather_reports: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Fetch photos count
    const photoCount = await prisma.file_assets.count({
      where: {
        claimId,
        mimeType: { startsWith: "image/" },
      },
    });

    // Fetch reports count
    const reportCount = await prisma.file_assets.count({
      where: {
        claimId,
        mimeType: "application/pdf",
      },
    });

    // Build property address
    const property = claim.properties;
    const propertyAddress = property
      ? `${property.street}, ${property.city}, ${property.state} ${property.zipCode}`
      : claim.title || "Property Address";

    // Extract weather data
    const weatherDoc = claim.weather_reports?.[0];
    const hasWeatherData = !!weatherDoc;

    // Determine scope info from metadata if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = (claim as any).metadata || {};
    const scopeTotal = metadata.scopeTotal || metadata.estimateTotal || null;

    // Generate the executive summary
    const summary = generateExecutiveSummary({
      claimNumber: claim.claimNumber || claimId,
      insuredName: claim.insured_name || "Insured",
      propertyAddress,
      dateOfLoss: claim.dateOfLoss?.toISOString().split("T")[0] || "Not specified",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dateOfInspection: (claim as any).inspectionDate?.toISOString().split("T")[0] || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      carrier: (claim as any).carrier || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      policyNumber: (claim as any).policyNumber || null,
      damageType: claim.damageType || "Storm damage",
      status: claim.status || "active",
      hasWeatherData,
      photoCount,
      reportCount,
      scopeTotal,
      description: claim.description || null,
    });

    return NextResponse.json({
      success: true,
      summary,
      metadata: {
        generatedAt: new Date().toISOString(),
        claimId,
        weatherDataUsed: hasWeatherData,
        photoCount,
        reportCount,
      },
    });
  } catch (error) {
    logger.error("Executive summary generation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

interface SummaryInput {
  claimNumber: string;
  insuredName: string;
  propertyAddress: string;
  dateOfLoss: string;
  dateOfInspection: string | null;
  carrier: string | null;
  policyNumber: string | null;
  damageType: string;
  status: string;
  hasWeatherData: boolean;
  photoCount: number;
  reportCount: number;
  scopeTotal: number | null;
  description: string | null;
}

function generateExecutiveSummary(input: SummaryInput): string {
  const {
    claimNumber,
    insuredName,
    propertyAddress,
    dateOfLoss,
    dateOfInspection,
    carrier,
    policyNumber,
    damageType,
    hasWeatherData,
    photoCount,
    reportCount,
    scopeTotal,
    description,
  } = input;

  const carrierLine = carrier ? `**Insurance Carrier:** ${carrier}` : "";
  const policyLine = policyNumber ? `**Policy Number:** ${policyNumber}` : "";
  const inspectionLine = dateOfInspection
    ? `**Date of Inspection:** ${dateOfInspection}`
    : "**Date of Inspection:** Pending";

  const scopeLine = scopeTotal
    ? `The estimated scope of repairs totals **$${Number(scopeTotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}**, inclusive of all labor, materials, and applicable code upgrades.`
    : "A detailed scope of repairs with associated costs is attached to this submission.";

  const weatherLine = hasWeatherData
    ? "Certified weather data has been obtained and is included in this submission, confirming storm activity at the property location on the date of loss."
    : "Weather verification is in progress and will be included upon completion.";

  const photoLine =
    photoCount > 0
      ? `**${photoCount} photographs** documenting the property condition and damage`
      : "Photographic documentation pending";

  const descriptionSection = description ? `\n### Additional Notes\n\n${description}\n` : "";

  return `## Executive Summary
### Claim #${claimNumber}

**Insured:** ${insuredName}
**Property Address:** ${propertyAddress}
**Date of Loss:** ${dateOfLoss}
${inspectionLine}
${carrierLine}
${policyLine}

---

### Claim Overview

This claim has been filed on behalf of **${insuredName}** for **${damageType.toLowerCase()}** sustained at the above-referenced property on **${dateOfLoss}**. A thorough field inspection was conducted to assess the extent of damage and document all affected areas.

### Damage Assessment

The inspection revealed damage consistent with the reported loss event affecting multiple components of the property. All damaged areas have been documented with photographic evidence and detailed measurements where applicable.

### Scope of Work

${scopeLine} All repairs are specified to meet current building code requirements and manufacturer installation specifications.

### Supporting Documentation

This claim submission includes:

- ${photoLine}
- ${reportCount > 0 ? `**${reportCount} supporting documents** and reports` : "Supporting reports to be generated"}
- ${hasWeatherData ? "Certified weather verification report" : "Weather verification (pending)"}
- Detailed scope of work and cost estimate
- Code compliance documentation where applicable

### Weather Verification

${weatherLine}
${descriptionSection}
### Conclusion

Based on the field inspection, documented damage patterns, and ${hasWeatherData ? "verified weather data" : "reported loss event"}, the damage to this property is consistent with the claimed loss. We respectfully request a thorough review of this submission and prompt processing of the claim.

---
*Generated by SkaiScraper AI — Claim #${claimNumber}*
*Report Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}*`.trim();
}
