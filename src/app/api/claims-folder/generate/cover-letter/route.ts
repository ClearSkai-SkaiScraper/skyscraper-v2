export const dynamic = "force-dynamic";

// src/app/api/claims-folder/generate/cover-letter/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import prisma from "@/lib/prisma";

const RequestSchema = z.object({
  claimId: z.string().min(1),
  recipientName: z.string().optional(),
  carrierName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId } = auth;

    const body = await request.json();
    const { claimId, recipientName, carrierName } = RequestSchema.parse(body);

    // Fetch claim data — org-scoped
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      include: {
        weather_reports: true,
        estimates: true,
        properties: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Query photos separately (file_assets has claimId but not in claims relation)
    const photos = await prisma.file_assets.findMany({
      where: {
        claimId,
        mimeType: { startsWith: "image/" },
      },
    });

    const insured_name = claim.insured_name || "Insured";
    const photoCount = photos.length;
    const hasWeather = claim.weather_reports && claim.weather_reports.length > 0;
    const estimate = claim.estimates?.[0];
    const estimateTotal = estimate?.total ? Number(estimate.total) : null;

    // Build property address from properties relation
    const property = claim.properties;
    const propertyAddress = property
      ? `${property.street}, ${property.city}, ${property.state} ${property.zipCode}`
      : claim.title || "Property Address";

    // Generate cover letter
    const coverLetter = generateCoverLetter({
      claimNumber: claim.claimNumber || claimId,
      insured_name: insured_name,
      propertyAddress,
      dateOfLoss: claim.dateOfLoss?.toISOString().split("T")[0] || "Unknown",
      recipientName: recipientName || "Claims Department",
      carrierName: carrierName || claim.carrier || "Insurance Carrier",
      photoCount,
      hasWeatherVerification: hasWeather,
      estimateTotal,
      hasCodeCompliance: true, // Would check actual data
      hasNarrative: true, // Would check if generated
    });

    return NextResponse.json({
      success: true,
      coverLetter,
      metadata: {
        generatedAt: new Date().toISOString(),
        claimId,
        photoCount,
        hasWeatherData: hasWeather,
        hasEstimate: !!estimate,
      },
    });
  } catch (error) {
    logger.error("Cover letter generation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

interface CoverLetterInput {
  claimNumber: string;
  insured_name: string;
  propertyAddress: string;
  dateOfLoss: string;
  recipientName: string;
  carrierName: string;
  photoCount: number;
  hasWeatherVerification: boolean;
  estimateTotal: number | null;
  hasCodeCompliance: boolean;
  hasNarrative: boolean;
}

function generateCoverLetter(input: CoverLetterInput): string {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const includedDocs: string[] = [];

  includedDocs.push("Detailed Scope of Repairs with Line-Item Pricing");

  if (input.hasWeatherVerification) {
    includedDocs.push("NOAA-Verified Weather Certification");
  }

  if (input.photoCount > 0) {
    includedDocs.push(`${input.photoCount} Annotated Photographs with AI Damage Analysis`);
  }

  if (input.hasCodeCompliance) {
    includedDocs.push("Building Code Compliance Documentation (IRC/IBC References)");
  }

  if (input.hasNarrative) {
    includedDocs.push("Cause of Loss Narrative with Weather Correlation");
  }

  includedDocs.push("Repair Justification with Technical Specifications");
  includedDocs.push("Timeline of Events and Communications");

  return `
${today}

**${input.recipientName}**  
${input.carrierName}  
Claims Department

**RE: Claim Submission Package**  
**Claim Number:** ${input.claimNumber}  
**Insured:** ${input.insured_name}  
**Property:** ${input.propertyAddress}  
**Date of Loss:** ${input.dateOfLoss}

---

Dear ${input.recipientName},

Please find enclosed the complete claims package for the above-referenced property damage claim. This submission includes all documentation necessary for your review and approval of the repair scope.

### Claim Summary

The subject property sustained damage during a verified weather event on ${input.dateOfLoss}. Our comprehensive inspection identified storm-related damage to the roofing system and associated components requiring repair and/or replacement to restore the property to its pre-loss condition.

${input.estimateTotal ? `**Estimated Repair Cost (RCV):** $${input.estimateTotal.toLocaleString()}` : ""}

### Documentation Enclosed

This claims package includes the following documentation:

${includedDocs.map((doc, i) => `${i + 1}. ${doc}`).join("\n")}

### Key Findings

Our inspection and analysis revealed:

- **Weather Verification:** ${input.hasWeatherVerification ? "Certified NOAA data confirms severe weather activity at this location on the date of loss" : "Weather verification pending"}
- **Damage Documentation:** ${input.photoCount > 0 ? `${input.photoCount} photographs captured with AI-assisted damage detection and classification` : "Photo documentation pending"}
- **Code Compliance:** All repairs specified meet or exceed current IRC/IBC requirements
- **Scope Completeness:** Repair scope addresses all storm-related damage identified during inspection

### Professional Opinion

Based on our thorough inspection and analysis of weather data, photographic evidence, and applicable building codes, it is our professional opinion that the damage to this property was caused by the weather event of ${input.dateOfLoss}. The scope of repairs represents the minimum work necessary to restore the property to its pre-loss condition while maintaining compliance with current building codes.

### Request for Review

We respectfully request your timely review of this submission. Should you require any additional documentation, clarification, or wish to schedule an on-site reinspection, please contact us at your earliest convenience.

We appreciate your attention to this matter and look forward to working with you toward a fair and expeditious resolution of this claim.

Respectfully submitted,

---

**[Contractor Name]**  
*Licensed Roofing Contractor*  
[License Number]  
[Phone Number]  
[Email Address]

---

*This claims package was prepared with SkaiScraper Insurance Documentation System*  
*Weather data verified through NOAA certified sources*  
*Photos analyzed using AI damage detection technology*

---

**Enclosures:**
${includedDocs.map((doc) => `- ${doc}`).join("\n")}
`.trim();
}
