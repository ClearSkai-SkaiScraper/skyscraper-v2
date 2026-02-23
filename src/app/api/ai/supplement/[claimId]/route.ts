/**
 * AI SUPPLEMENT WRITER - CARRIER PUSHBACK EXPERT
 *
 * Automatically generates supplements that respond to specific carrier pushbacks:
 * - "Cosmetic only" → Mat fracture + brittle test
 * - "Repair feasible" → Manufacturer non-repairability
 * - "Water damage unrelated" → Storm opening + moisture mapping
 * - "Insufficient damage" → Hit count + code violations
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { getOpenAI } from "@/lib/ai/client";
import { createAiConfig, withAiBilling } from "@/lib/ai/withAiBilling";

import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { supplementClaimSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

const openai = getOpenAI();

async function POST_INNER(
  request: NextRequest,
  ctx: { userId: string; orgId: string | null },
  { params }: { params: { claimId: string } }
) {
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

    const { claimId } = params;
    const body = await request.json();
    const validation = validateAIRequest(supplementClaimSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }
    const { pushbackType, carrierNotes } = validation.data;

    // Get claim data
    const claim = await prisma.claims.findFirst({
      where: {
        id: claimId,
        orgId: orgId,
      },
      include: {
        properties: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Carrier strategy placeholder (negotiation strategies stored in metadata)
    const carrierStrategy = null;

    // Build pushback-specific response
    const pushbackResponse = getPushbackResponse(
      pushbackType || "general",
      claim.carrier || "UNKNOWN"
    );

    const prompt = `
You are an expert insurance supplement writer responding to carrier pushbacks.

CLAIM DETAILS:
- Claim ID: ${claimId}
- Carrier: ${claim.carrier || "Unknown"}
- Property: ${claim.properties?.street || "Unknown"}
- Pushback Type: ${pushbackType || "General denial"}
- Carrier Notes: ${carrierNotes || "No specific notes provided"}

${pushbackResponse}

WRITE A PROFESSIONAL SUPPLEMENT THAT:

1. ACKNOWLEDGES CARRIER POSITION
   - Quote their exact pushback language
   - Show understanding of their concern

2. PROVIDES CLEAR REFUTATION
   - Use specific evidence (photos, tests, manufacturer docs)
   - Cite building codes (R905.2.8.5, R806, R903, FM 1-29)
   - Reference manufacturer non-repairability statements
   - Include weather correlation (NOAA, HailTrace)

3. APPLIES CARRIER-SPECIFIC STRATEGY
   ${claim.carrier === "STATE FARM" ? "- Focus on LKQ, brittle test failures, mat fractures" : ""}
   ${claim.carrier === "ALLSTATE" ? "- Emphasize functional vs cosmetic with mat fracture evidence" : ""}
   ${claim.carrier === "AAA" ? "- Provide extensive photographic correlation (10+ photos)" : ""}
   ${claim.carrier === "PROGRESSIVE" ? "- Document sudden & accidental nature with timestamps" : ""}
   ${claim.carrier === "USAA" ? "- Include FLIR moisture maps with serial numbers" : ""}
   ${claim.carrier === "TRAVELERS" ? "- Provide NOAA correlation and directionality documentation" : ""}

4. INCLUDES SUPPORTING DOCUMENTATION
   - Photo index with descriptions
   - Code citations with exact sections
   - Manufacturer specifications
   - Weather verification
   - Test results (brittle test, moisture mapping)

5. CLOSES WITH CLEAR REQUEST
   - Specific dollar amount for supplement
   - Timeline for response
   - Escalation path if denied (A.R.S. §20-461 for Arizona)

Format as professional insurance supplement ready for submission.
Use clear section headers and bullet points.
Be assertive but professional.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert insurance supplement writer with deep knowledge of carrier pushback tactics and successful rebuttal strategies. You help contractors maximize claim approvals while maintaining ethical practices.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const generatedSupplement = completion.choices[0].message.content;

    // Persist supplement to DB
    let savedSupplementId: string | null = null;
    try {
      const created = await prisma.supplements.create({
        data: {
          id: crypto.randomUUID(),
          claim_id: claimId,
          org_id: orgId,
          created_by: userId,
          status: "DRAFT",
          notes: generatedSupplement || "",
          internal_notes: `AI-generated response to ${pushbackType || "general"} pushback from ${claim.carrier || "carrier"}`,
          updated_at: new Date(),
        },
      });
      savedSupplementId = created.id;

      // Save the generated text as a supplement item
      await prisma.supplement_items.create({
        data: {
          id: crypto.randomUUID(),
          supplement_id: created.id,
          claim_id: claimId,
          name: `${pushbackType || "General"} Pushback Response`,
          code: "SUP-AI",
          description: generatedSupplement || "",
          justification: `AI-generated response to ${pushbackType || "general"} pushback`,
          source: "ai",
          status: "pending",
          updated_at: new Date(),
        },
      });
    } catch (dbErr) {
      logger.error("[AI Supplement] Failed to persist to DB:", dbErr);
      // Continue — return the generated text even if DB save fails
    }

    logger.info(
      `[AI Supplement] Generated for claim ${claimId}, type: ${pushbackType}, tokens: ${completion.usage?.total_tokens}`
    );

    return NextResponse.json({
      success: true,
      supplement: generatedSupplement,
      supplementId: savedSupplementId,
      pushbackType,
    });
  } catch (error) {
    logger.error("AI Supplement Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate supplement" }, { status: 500 });
  }
}

/**
 * Get pushback-specific response strategies
 */
function getPushbackResponse(pushbackType: string, carrier: string): string {
  const responses: Record<string, string> = {
    cosmetic: `
RESPONDING TO "COSMETIC ONLY" PUSHBACK:
1. Document mat fracture with close-up photos
2. Show substrate bruising or exposed asphalt
3. Include brittle test results (bend shingle 180° - if cracks, it's functional)
4. Reference manufacturer warranty implications
5. Cite functional impairment vs aesthetic damage
6. Show granule loss with substrate exposure
    `,
    repair_feasible: `
RESPONDING TO "REPAIR FEASIBLE" PUSHBACK:
1. Provide manufacturer statement on non-repairability
2. Document discontinued product (requires full slope for LKQ)
3. Show interlocking design prevents individual unit replacement
4. Reference manufacturer warranty void if repaired
5. Include brittle test showing age-related deterioration
6. Cite industry standards (NRCA, ARMA) on replacement vs repair
    `,
    water_unrelated: `
RESPONDING TO "WATER DAMAGE UNRELATED TO STORM" PUSHBACK:
1. Document storm-created opening with photos
2. Provide FLIR moisture mapping with dates
3. Show correlation between storm date and water intrusion
4. Include serial-numbered equipment logs
5. Reference "sudden & accidental" policy language
6. Show no pre-existing water damage (before/after if available)
    `,
    insufficient_damage: `
RESPONDING TO "INSUFFICIENT DAMAGE" PUSHBACK:
1. Provide hit count documentation (8-12 per 100 sq ft standard)
2. Include test square photos (minimum 10x10 marked area)
3. Show wind damage (creasing, uplift, displaced shingles)
4. Document code violations requiring upgrade
5. Reference manufacturer functional damage thresholds
6. Include collateral damage (gutters, screens, HVAC)
    `,
    code_not_covered: `
RESPONDING TO "CODE UPGRADES NOT COVERED" PUSHBACK:
1. Cite policy "ordinance or law" coverage
2. Reference state requirements (A.R.S. §20-461 in Arizona)
3. Document that repairs trigger code compliance requirements
4. Show cost difference between code and non-code work
5. Include building department requirements
6. Reference carrier's obligation under state insurance law
    `,
    overhead_profit: `
RESPONDING TO "OVERHEAD & PROFIT DENIED" PUSHBACK:
1. Document job complexity (multi-trade, steep slope, multi-story)
2. Provide historical invoices showing O&P is industry standard
3. Show coordination requirements between trades
4. Reference Xactimate pricing methodology includes O&P
5. Cite risk of contractor churn without proper compensation
6. Include contractor licensing and insurance costs
    `,
  };

  return responses[pushbackType] || responses.insufficient_damage;
}

export const POST = withAiBilling(
  createAiConfig("ai_supplement", { costPerRequest: 20 }),
  async (req: NextRequest, ctx): Promise<NextResponse<any>> => {
    const url = new URL(req.url);
    const claimId = url.pathname.split("/").pop() || "";
    return POST_INNER(req, ctx, { params: { claimId } });
  }
);
