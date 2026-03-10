export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { getOpenAI } from "@/lib/ai/client";
import { requireApiOrg, verifyClaimAccess } from "@/lib/auth/apiAuth";
import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const CATEGORIES = [
  "Roofing",
  "Siding",
  "Gutters",
  "Interior",
  "General Conditions",
  "Overhead & Profit",
  "Labor",
  "Materials",
  "Permits",
  "Other",
];

const UNITS = ["SF", "LF", "EA", "SQ", "HR", "LS", "CY", "GAL"];

/**
 * POST /api/ai/supplement/generate-items
 * AI-assisted generation of supplement line items based on damage description
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireApiOrg();
    if (authResult instanceof NextResponse) return authResult;

    const { userId, orgId } = authResult;
    if (!orgId) {
      return NextResponse.json({ error: "Organization required." }, { status: 400 });
    }

    // Billing guard
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

    // Rate limit (AI tier)
    const rl = await checkRateLimit(userId, "AI");
    if (!rl.success) {
      return NextResponse.json(
        {
          error: "rate_limit_exceeded",
          message: "Too many AI requests. Please try again later.",
          retryAfter: rl.reset,
        },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
        }
      );
    }

    const body = await req.json();
    const { prompt, claimId } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Verify claim access if claimId provided
    if (claimId) {
      const accessResult = await verifyClaimAccess(claimId, orgId, userId);
      if (accessResult instanceof NextResponse) return accessResult;
    }

    // Get claim context if available
    let claimContext = "";
    if (claimId) {
      const claim = await prisma.claims.findUnique({
        where: { id: claimId },
        select: {
          claimNumber: true,
          damageType: true,
          carrier: true,
          properties: {
            select: { city: true, state: true },
          },
        },
      });
      if (claim) {
        claimContext = `
Claim Context:
- Claim Number: ${claim.claimNumber || "N/A"}
- Damage Type: ${claim.damageType || "Unknown"}
- Carrier: ${claim.carrier || "Unknown"}
- Location: ${claim.properties?.city || ""}, ${claim.properties?.state || ""}
`;
      }
    }

    const openai = getOpenAI();

    const systemPrompt = `You are an expert insurance claims supplement specialist. Generate detailed line items for a claim supplement based on the contractor's description of missed or underpaid items.

${claimContext}

For each item, provide:
- category: One of ${JSON.stringify(CATEGORIES)}
- code: An Xactimate-style code (e.g., "RFG LAMI" for laminate shingles, "PLB PIPE" for pipe boots)
- description: Clear, professional description
- quantity: Estimated quantity based on typical residential work
- unit: One of ${JSON.stringify(UNITS)}
- unitPrice: Current market price for the work (be realistic for the region)

Respond with a JSON object containing an "items" array. Example:
{
  "items": [
    {
      "category": "Roofing",
      "code": "RFG VENT",
      "description": "Ridge vent - aluminum",
      "quantity": 35,
      "unit": "LF",
      "unitPrice": 8.50
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);

    logger.info("[SUPPLEMENT_AI_GENERATE]", {
      userId,
      orgId,
      claimId,
      itemCount: parsed.items?.length || 0,
    });

    return NextResponse.json({
      items: parsed.items || [],
      model: response.model,
      usage: response.usage,
    });
  } catch (error) {
    logger.error("[SUPPLEMENT_AI_GENERATE_ERROR]", error);
    return NextResponse.json({ error: "Failed to generate line items" }, { status: 500 });
  }
}
