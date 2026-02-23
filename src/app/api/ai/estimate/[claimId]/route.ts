/**
 * AI ESTIMATE GENERATOR - CARRIER-AWARE
 *
 * Automatically generates Xactimate-style estimates with:
 * - Carrier-specific strategies
 * - All 15 global rules applied
 * - Code citations (R905, R806, FM 1-29)
 * - Manufacturer non-repairability docs
 * - Weather correlation
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { getOpenAI } from "@/lib/ai/client";
import { createAiConfig, withAiBilling, type AiBillingContext } from "@/lib/ai/withAiBilling";

import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const openai = getOpenAI();

async function POST_INNER(
  request: NextRequest,
  ctx: AiBillingContext
): Promise<
  NextResponse<
    | { success: boolean; estimate: string | null; rulesApplied: number; carrierStrategy: boolean }
    | { error: string }
  >
> {
  try {
    const { userId, orgId } = ctx;

    if (!orgId) {
      return NextResponse.json({ error: "Organization required" }, { status: 400 });
    }

    // ── Billing guard ──
    try {
      await requireActiveSubscription(orgId);
    } catch (error) {
      if (error instanceof SubscriptionRequiredError) {
        return NextResponse.json(
          { error: "subscription_required", message: "Active subscription required" },
          { status: 402 }
        );
      }
      throw error;
    }

    // ── Rate limit ──
    const rl = await checkRateLimit(userId, "AI");
    if (!rl.success) {
      return NextResponse.json(
        {
          error: "rate_limit_exceeded",
          message: "Too many requests. Please try again later.",
          retryAfter: rl.reset,
        },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
        }
      );
    }

    // Extract claimId from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const claimId = pathParts[pathParts.length - 1];

    if (!claimId) {
      return NextResponse.json({ error: "Claim ID required" }, { status: 400 });
    }

    // Get claim with all related data
    const claim = await prisma.claims.findFirst({
      where: {
        id: claimId,
        orgId: orgId,
      },
      include: {
        properties: true,
        ai_reports: true,
        inspections: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Rules are hardcoded in the prompt - no database table exists
    const rules = [
      "Functional Hail Damage",
      "Mat Fracture Detection",
      "Brittle Test",
      "Wind Damage",
      "Code Requirements",
      "Manufacturer Limitations",
      "Storm Opening Required",
      "NOAA/HailTrace Correlation",
      "Directionality",
      "FM 1-29",
      "Like-Kind-Quality",
      "Moisture Mapping",
      "Sudden & Accidental",
      "Collateral Damage",
      "Non-Staining",
    ];

    // Carrier strategy - could be enhanced with a lookup table
    // For now, we use the carrier guidance function
    const carrierStrategy = null;

    // Build carrier-specific prompt
    const carrierGuidance = getCarrierGuidance(claim.carrier || "UNKNOWN");

    const prompt = `
You are an expert insurance claim estimator generating a comprehensive Xactimate-style estimate.

CLAIM DETAILS:
- Claim ID: ${claimId}
- Carrier: ${claim.carrier || "Unknown"}
- Property: ${claim.properties ? `${claim.properties.street}, ${claim.properties.city}, ${claim.properties.state}` : "Unknown"}
- Damage Type: ${claim.damageType || "Unknown"}
- Date of Loss: ${claim.dateOfLoss || "Unknown"}
- Photos: ${claim.inspections?.length || 0} inspections
- Documents: ${claim.ai_reports?.length || 0} AI reports

APPLY THESE UNIVERSAL RULES:
1. Functional Hail Damage: 8-12 hits per 100 sq ft = full replacement
2. Mat Fracture Detection: Any mat fracture = slope replacement
3. Brittle Test: Failed brittle test = non-repairable
4. Wind Damage: Creasing, uplift, or displaced shingles = replacement
5. Code Requirements:
   - IRC R905.2.8.5: Drip edge required on all eaves and rakes
   - IRC R905.1.2: Ice & water shield on slopes ≤4:12
   - IRC R806: Proper ventilation (1:150 or 1:300 with vapor barrier)
6. Manufacturer Limitations: Tile/metal/interlocking = cannot repair individual units
7. Storm Opening Required: Water damage only covered if storm-created opening exists
8. NOAA/HailTrace Correlation: Verify weather data matches claimed storm date
9. Directionality: Document wind direction via bent fins, debris patterns
10. FM 1-29: Commercial edge metal compliance for flat/low-slope roofs
11. Like-Kind-Quality: Discontinued materials require full slope replacement
12. Moisture Mapping: FLIR documentation with serial-numbered logs
13. Sudden & Accidental: Water intrusion must be storm-related, not gradual
14. Collateral Damage: Document gutters, screens, HVAC, paint
15. Non-Staining: Granule loss with substrate exposure = functional damage

${carrierGuidance}

GENERATE A COMPREHENSIVE ESTIMATE INCLUDING:

1. EXECUTIVE SUMMARY
   - Total damage assessment
   - Replacement vs repair recommendation
   - Compliance requirements

2. SCOPE OF WORK
   - Line items with quantities
   - Material specifications
   - Labor requirements
   - Code upgrades required

3. CODE CITATIONS
   - R905.2.8.5 drip edge
   - R806 ventilation
   - R903 flashing
   - FM 1-29 (if commercial)

4. MANUFACTURER DOCUMENTATION
   - Discontinued product references
   - Non-repairability statements
   - Warranty implications

5. WEATHER CORRELATION
   - NOAA storm data
   - HailTrace verification
   - Date of loss confirmation

6. PHOTOGRAPHIC EVIDENCE REQUIREMENTS
   - Test squares (minimum 10x10)
   - Directional damage
   - Code violations
   - Collateral damage

7. COST BREAKDOWN
   - Materials
   - Labor
   - Overhead & Profit
   - Code compliance upgrades
   - Total

Format as professional insurance estimate ready for submission.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert insurance claim estimator with deep knowledge of carrier requirements, building codes, and Xactimate pricing.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const generatedEstimate = completion.choices[0].message.content;

    // Save estimate to ai_reports table for the claim
    await prisma.ai_reports.create({
      data: {
        id: crypto.randomUUID(),
        claimId: claimId,
        orgId: orgId,
        type: "estimate",
        title: `AI Generated Estimate - ${claim.carrier || "Unknown"} Carrier`,
        content: generatedEstimate || "",
        model: "gpt-4o",
        tokensUsed: completion.usage?.total_tokens || 0,
        userId: userId,
        userName: "AI System",
        updatedAt: new Date(),
      },
    });

    // Log AI action to console
    logger.info(`[AI Estimate] Generated estimate for claim: ${claimId}`, {
      carrier: claim.carrier,
      inspectionsCount: claim.inspections?.length || 0,
      aiReportsCount: claim.ai_reports?.length || 0,
      estimateLength: generatedEstimate?.length || 0,
      rulesApplied: rules.length,
      tokensUsed: completion.usage?.total_tokens,
    });

    return NextResponse.json({
      success: true,
      estimate: generatedEstimate,
      rulesApplied: rules.length,
      carrierStrategy: carrierStrategy ? true : false,
    });
  } catch (error) {
    logger.error("AI Estimate Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate estimate" },
      { status: 500 }
    );
  }
}

/**
 * Get carrier-specific guidance for estimate generation
 */
function getCarrierGuidance(carrier: string): string {
  const guidance: Record<string, string> = {
    "STATE FARM": `
STATE FARM SPECIFIC REQUIREMENTS:
- Emphasize Like-Kind-Quality (LKQ) for discontinued materials
- Document brittle test failures extensively
- Focus on mat fracture as functional impairment
- Include manufacturer statements on non-repairability
- Use clear, labeled photos (minimum 10x10 test squares)
- Cite exact code sections (R905.2.8.5, R806)
    `,
    AAA: `
AAA SPECIFIC REQUIREMENTS:
- Heavy photographic correlation required (6-10 photos per slope)
- 8-12 hits per 100 sq ft standard strictly enforced
- Document collateral damage (gutters, screens, HVAC)
- Slope-level correlation between photos and damage claims
- Manufacturer repair limitations must be explicitly stated
    `,
    ALLSTATE: `
ALLSTATE SPECIFIC REQUIREMENTS:
- Differentiate cosmetic vs functional damage clearly
- Document mat fractures, substrate bruising, exposed asphalt
- Include brittle test results with photos
- Address "repair feasible" pushbacks with manufacturer docs
- Overhead & Profit: document job complexity (multi-trade, steep, multi-story)
    `,
    PROGRESSIVE: `
PROGRESSIVE SPECIFIC REQUIREMENTS:
- Focus on "sudden & accidental" nature of damage
- Timestamp and GPS-tag all documentation
- Water intrusion must link to storm-created opening
- Include detailed moisture mapping with FLIR
- Serial-numbered logs for all equipment used
    `,
    USAA: `
USAA SPECIFIC REQUIREMENTS:
- Evidence integrity paramount (timestamped, GPS-tagged)
- FLIR moisture mapping with serial numbers
- Detailed correlation between storm date and damage
- Manufacturer non-repairability statements required
- Include historical weather data (NOAA, HailTrace)
    `,
    TRAVELERS: `
TRAVELERS SPECIFIC REQUIREMENTS:
- NOAA/HailTrace correlation mandatory
- Directionality documentation (wind vector mapping)
- FM 1-29 compliance for commercial properties
- Code enforcement matrix (cost of code vs non-code)
- Collateral damage documentation
    `,
    NATIONWIDE: `
NATIONWIDE SPECIFIC REQUIREMENTS:
- 8-12 hits standard
- Manufacturer repair limitations
- FM 1-29 for commercial edge metal
- Ventilation code compliance (R806)
- Detailed scope with quantities and specifications
    `,
    "LIBERTY MUTUAL": `
LIBERTY MUTUAL SPECIFIC REQUIREMENTS:
- Code enforcement emphasis (always include code upgrades)
- Brittle test failures documented
- Tile/metal manufacturer limitations
- FM 1-29 commercial standards
- Overhead & Profit justification with historical invoices
    `,
    FARMERS: `
FARMERS SPECIFIC REQUIREMENTS:
- NOAA storm correlation
- 8-12 hits per 100 sq ft
- Manufacturer non-repairability for tile/metal
- Code citations (R905, R806, R903)
- Directionality documentation
    `,
    "AMERICAN FAMILY": `
AMERICAN FAMILY SPECIFIC REQUIREMENTS:
- Brittle test failures with photos
- Mat fracture documentation
- Manufacturer repair limitations (tile, metal, interlock)
- Water intrusion must link to storm opening
- NOAA/HailTrace verification
    `,
  };

  return guidance[carrier.toUpperCase()] || "";
}

export const POST = withAiBilling(
  createAiConfig("ai_estimate", { costPerRequest: 20 }),
  POST_INNER
);
