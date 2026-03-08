// src/app/api/ai/dashboard-assistant/route.ts
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getResolvedOrgId } from "@/lib/auth/getResolvedOrgId";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { dashboardAssistantSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Verify org access — MUST be authenticated
    const resolvedOrgId = await getResolvedOrgId();
    if (!resolvedOrgId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Rate limit AI requests
    const rl = await checkRateLimit(resolvedOrgId, "AI");
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json();
    const validated = validateAIRequest(dashboardAssistantSchema, body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error, details: validated.details },
        { status: 422 }
      );
    }

    const { claimId, action, prompt, orgId } = validated.data;

    // Security: Verify orgId matches resolved
    if (orgId !== resolvedOrgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify claim belongs to org
    const claim = await prisma.claims.findFirst({
      where: {
        id: claimId,
        orgId: resolvedOrgId,
      },
      select: {
        id: true,
        claimNumber: true,
        insured_name: true,
        damageType: true,
        status: true,
        properties: {
          select: {
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Derive address from property relation
    const propertyAddress = claim.properties
      ? `${claim.properties.street}, ${claim.properties.city}, ${claim.properties.state} ${claim.properties.zipCode}`
      : "Address not available";
    const clientName = claim.insured_name || "Unknown";
    const claimType = claim.damageType || "Storm Damage";

    // Build context for AI
    const context = {
      claim: {
        number: claim.claimNumber,
        insured: clientName,
        property: propertyAddress,
        type: claimType,
        status: claim.status,
      },
      action,
      instructions: prompt,
    };

    // NOTE: Using template responses - integrate with OpenAI/Claude when API keys configured
    // For now, return mock response
    const mockResponses = {
      supplement: `SUPPLEMENT REQUEST - Claim ${claim.claimNumber}

Additional damage discovered during inspection at ${propertyAddress}:

1. ROOF DAMAGE (Additional)
   - 15 additional damaged shingles on north slope
   - Underlayment exposure in 3 locations
   - Estimated: $2,450

2. INTERIOR DAMAGE
   - Water staining on ceiling drywall (2 rooms)
   - Insulation replacement needed
   - Estimated: $1,875

3. GUTTERS & DOWNSPOUTS
   - 2 sections detached and damaged
   - Fascia repair required
   - Estimated: $680

TOTAL ADDITIONAL: $5,005

This supplement reflects damage not visible or accessible during the initial inspection. Photos and documentation attached.`,

      depreciation: `DEPRECIATION ANALYSIS - Claim ${claim.claimNumber}

PROPERTY: ${propertyAddress}
ANALYSIS DATE: ${new Date().toLocaleDateString()}

ROOFING MATERIALS:
- Architectural Shingles (20-year warranty)
- Original Install: Estimated 8 years ago
- Remaining Life: 60%
- RCV: $12,500
- Depreciation: $5,000 (40%)
- ACV: $7,500

INTERIOR FINISHES:
- Drywall & Paint
- Age: 8 years
- Depreciation Rate: 2.5% per year
- RCV: $3,200
- Depreciation: $640 (20%)
- ACV: $2,560

TOTAL CLAIM:
- RCV Total: $15,700
- Total Depreciation: $5,640
- ACV Total: $10,060

Depreciation will be recoverable upon completion of repairs with proper documentation.`,

      estimate: `DETAILED ESTIMATE - Claim ${claim.claimNumber}

PROPERTY: ${propertyAddress}
DATE: ${new Date().toLocaleDateString()}

SCOPE OF WORK:

1. ROOFING
   - Remove existing damaged shingles (35 squares)
   - Install new underlayment
   - Install architectural shingles
   - Replace ridge vent
   - Install new flashing
   Labor: $4,500
   Materials: $6,200
   SUBTOTAL: $10,700

2. EXTERIOR
   - Fascia repair (40 LF)
   - Gutter replacement (2 sections)
   - Downspout reconnection
   Labor: $450
   Materials: $380
   SUBTOTAL: $830

3. INTERIOR
   - Drywall replacement (80 SF)
   - Texture & paint (2 rooms)
   - Insulation replacement
   Labor: $1,200
   Materials: $675
   SUBTOTAL: $1,875

GRAND TOTAL: $13,405
TAX (estimated): $1,072
TOTAL WITH TAX: $14,477

Timeline: 5-7 business days
Warranty: 10 years workmanship, manufacturer warranty on materials`,

      report: `COMPREHENSIVE CLAIM REPORT - ${claim.claimNumber}

PROPERTY INFORMATION:
Address: ${propertyAddress}
Insured: ${clientName}
Loss Type: ${claimType}
Status: ${claim.status}

EXECUTIVE SUMMARY:
Comprehensive inspection conducted on ${new Date().toLocaleDateString()}. Damage consistent with recent storm event. All damage directly related to covered peril.

FINDINGS:
1. Primary roof damage from high winds and hail impact
2. Secondary water intrusion damage to interior
3. Gutters and fascia compromised
4. No pre-existing conditions that would limit coverage

DOCUMENTATION:
- 47 photos documenting all damage
- Weather data confirming storm on date of loss
- Moisture readings confirming active leak
- Contractor estimates for validation

RECOMMENDATIONS:
1. APPROVE: Full roof replacement justified by extent of damage
2. APPROVE: Interior repairs necessary to restore property
3. APPROVE: Exterior trim and gutter work required
4. Estimated Total: $14,477 (RCV)
5. Depreciation holdback: $5,640 (recoverable)

CONCLUSION:
All damage is directly attributable to covered storm event. Recommend approval of claim as documented. Property owner has acted in good faith to mitigate further damage.

Next Steps:
- Issue initial payment (ACV)
- Authorize repairs to proceed
- Schedule final inspection for depreciation recovery

Report prepared: ${new Date().toLocaleDateString()}`,
    };

    const output = mockResponses[action];

    // Log the AI action for analytics
    logger.debug(`[Dashboard AI] Generated ${action} for claim ${claimId}`);

    // Save as artifact for persistence (for depreciation and report actions)
    if (
      action === "depreciation" ||
      action === "estimate" ||
      action === "supplement" ||
      action === "report"
    ) {
      const artifactTypeMap = {
        depreciation: "depreciation_worksheet",
        estimate: "scope_of_work",
        supplement: "supplement_report",
        report: "claim_report",
      } as const;

      await prisma.ai_reports.create({
        data: {
          id: randomUUID(),
          orgId: resolvedOrgId,
          claimId,
          userId: "system", // Dashboard assistant doesn't have userId context
          userName: "AI Assistant",
          type: artifactTypeMap[action],
          title: `AI Generated ${action.charAt(0).toUpperCase() + action.slice(1)}`,
          content: output,
          tokensUsed: 0, // Mock responses don't use tokens
          model: "mock",
          status: "generated",
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      output,
      metadata: {
        action,
        claimId: claim.id,
        claimNumber: claim.claimNumber,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("[Dashboard AI API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
