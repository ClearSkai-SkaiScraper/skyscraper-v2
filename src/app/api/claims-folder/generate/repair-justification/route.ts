export const dynamic = "force-dynamic";

// src/app/api/claims-folder/generate/repair-justification/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import prisma from "@/lib/prisma";

const RequestSchema = z.object({
  claimId: z.string().min(1),
});

interface RepairItem {
  item: string;
  quantity: string;
  unit: string;
  reason: string;
  codeReference: string;
  technicalJustification: string;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId } = auth;

    const body = await request.json();
    const { claimId } = RequestSchema.parse(body);

    // Fetch claim data with properties relation — org-scoped
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      include: {
        estimates: true,
        properties: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Build property address from relation
    const property = claim.properties;
    const propertyAddress = property
      ? `${property.street}, ${property.city}, ${property.state} ${property.zipCode}`
      : claim.title || "Property";

    // Get scope data from estimate if available
    const estimate = claim.estimates?.[0];
    const hasEstimate = !!estimate;

    // Get roof type from property if available
    const roofType = property?.roofType || "Asphalt Shingle";

    // Generate repair justification (in production, would use AI)
    const justification = generateRepairJustification({
      claimId,
      propertyAddress,
      roofType,
      hasEstimate,
      estimateTotal: estimate?.total ? Number(estimate.total) : null,
    });

    return NextResponse.json({
      success: true,
      justification,
      metadata: {
        generatedAt: new Date().toISOString(),
        claimId,
        hasEstimateData: hasEstimate,
      },
    });
  } catch (error) {
    logger.error("Repair justification generation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

interface JustificationInput {
  claimId: string;
  propertyAddress: string;
  roofType: string;
  hasEstimate: boolean;
  estimateTotal: number | null;
}

function generateRepairJustification(input: JustificationInput): {
  summary: string;
  items: RepairItem[];
  codeCompliance: string;
  manufacturerSpecs: string;
} {
  const items: RepairItem[] = [
    {
      item: "Remove & Replace Asphalt Shingles",
      quantity: "28",
      unit: "SQ",
      reason: "Storm damage with hail impact fractures compromising waterproof integrity",
      codeReference: "IRC R905.2.6",
      technicalJustification: `Asphalt shingles have sustained hail impact damage resulting in:
- Granule displacement exposing underlying mat
- Fractures in shingle surface creating water intrusion pathways  
- Compromised self-sealing strips affecting wind resistance
Per IRC R905.2.6, asphalt shingles must provide a weather-resistant barrier. Damaged shingles no longer meet this requirement and must be replaced to restore code compliance.`,
    },
    {
      item: "Synthetic Underlayment",
      quantity: "28",
      unit: "SQ",
      reason: "Code requirement for roof replacement in this jurisdiction",
      codeReference: "IRC R905.1.1",
      technicalJustification: `When roof covering is removed and replaced, underlayment must be installed per IRC R905.1.1. Synthetic underlayment provides:
- Superior tear resistance during installation
- Better UV protection for exposed periods
- Enhanced water resistance versus felt products`,
    },
    {
      item: "Ridge Cap Shingles",
      quantity: "85",
      unit: "LF",
      reason: "Existing ridge caps show hail damage and must be replaced with shingle replacement",
      codeReference: "IRC R905.2.8.2",
      technicalJustification: `Ridge cap shingles protect the most vulnerable point of the roof system. Damaged ridge caps were observed showing:
- Multiple hail strikes with granule loss
- Cracking at fold lines
- Compromised sealing tabs
Per manufacturer requirements and code, ridge caps must be replaced when field shingles are replaced to maintain warranty coverage.`,
    },
    {
      item: "Drip Edge",
      quantity: "195",
      unit: "LF",
      reason: "Code upgrade required when roof covering is replaced",
      codeReference: "IRC R905.2.8.5",
      technicalJustification: `Drip edge is required by IRC R905.2.8.5 at eaves and rake edges. When existing roof covering is removed, drip edge must be:
- Installed where missing
- Replaced where damaged
- Extended per current code requirements`,
    },
    {
      item: "Step Flashing",
      quantity: "45",
      unit: "LF",
      reason: "Must be integrated with new roof covering at wall intersections",
      codeReference: "IRC R903.2.1",
      technicalJustification: `Step flashing at roof-to-wall intersections cannot be properly reused when roof covering is replaced. New step flashing:
- Must be woven with each course of shingles
- Requires proper counterflashing integration
- Cannot be separated from existing shingles without damage`,
    },
  ];

  const summary = `
## Repair Justification Report
### Claim: ${input.claimId}
### Property: ${input.propertyAddress}

This document provides technical justification for each repair item, citing applicable building codes and manufacturer specifications. All repairs are necessary to restore the property to pre-loss condition while maintaining code compliance.

### Scope Overview

${input.hasEstimate && input.estimateTotal ? `**Estimated Total (RCV):** $${input.estimateTotal.toLocaleString()}` : "*Estimate pending*"}

The scope of repairs addresses storm-related damage to the roofing system. Each line item below includes:
- Quantity and unit of measure
- Reason for repair/replacement
- Applicable building code reference
- Technical justification supporting the necessity

All repairs must be performed by qualified contractors following manufacturer specifications and local building code requirements.
`.trim();

  const codeCompliance = `
### Building Code Compliance Statement

All repairs specified in this scope are required to restore the property to pre-loss condition while maintaining compliance with:

- **International Residential Code (IRC) 2021** - Sections R903-R905 governing roof assemblies
- **Local Building Code Amendments** - As adopted by jurisdiction
- **ASTM Standards** - Applicable material and installation standards
- **FM Global Requirements** - Where applicable for commercial components

The scope accounts for code-required upgrades per IRC R102.7.1, which mandates that repairs, alterations, and additions comply with current code requirements to the extent required for new construction when the work area includes the repair scope.

### Key Code Requirements Applied:

1. **Underlayment** (IRC R905.1.1) - Required beneath all roof coverings
2. **Drip Edge** (IRC R905.2.8.5) - Required at eaves and rakes
3. **Flashing** (IRC R903.2) - Required at intersections and penetrations
4. **Ice Barrier** (IRC R905.1.2) - Required in cold climates where applicable
5. **Ventilation** (IRC R806) - Must meet minimum requirements
`.trim();

  const manufacturerSpecs = `
### Manufacturer Specification Compliance

Repairs will be performed in accordance with manufacturer installation requirements to maintain warranty coverage:

**Shingle Manufacturer Requirements:**
- Minimum 4 nails per shingle (6 in high-wind areas)
- Proper exposure limits per shingle type
- Starter strip at all eaves and rakes
- Hip and ridge shingle installation per spec
- Temperature limitations during installation

**Underlayment Requirements:**
- Minimum 4" head lap, 6" side lap
- Proper fastener pattern per manufacturer
- Cap nails or approved fasteners only

**Accessory Requirements:**
- Metal flashings minimum 26 gauge galvanized
- Sealants compatible with roofing materials
- Proper ventilation balance maintained

*Failure to follow manufacturer specifications may void warranty coverage.*
`.trim();

  return {
    summary,
    items,
    codeCompliance,
    manufacturerSpecs,
  };
}
