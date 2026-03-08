export const dynamic = "force-dynamic";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { createAiConfig, withAiBilling, type AiBillingContext } from "@/lib/ai/withAiBilling";
import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import { checkRateLimit, getRateLimitError } from "@/lib/ratelimit";
import { estimateValueSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

/**
 * AI-powered exposure/value estimation endpoint
 * Estimates claim value based on property details and damage type
 * Rate-limited and authenticated
 */
async function POST_INNER(req: NextRequest, ctx: AiBillingContext) {
  try {
    const { userId, orgId } = ctx;

    // ── Billing guard ──
    try {
      await requireActiveSubscription(orgId!);
    } catch (error) {
      if (error instanceof SubscriptionRequiredError) {
        return NextResponse.json(
          { error: "subscription_required", message: "Active subscription required" },
          { status: 402 }
        );
      }
      throw error;
    }

    // Rate limiting check
    const identifier = orgId || userId;
    const rateLimit = await checkRateLimit(identifier, "AI");
    if (!rateLimit.success) {
      return NextResponse.json({ error: getRateLimitError(rateLimit.reset) }, { status: 429 });
    }

    const body = await req.json();
    const validation = validateAIRequest(estimateValueSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }
    const { damageType, propertyAddress, dateOfLoss, propertyType } = validation.data;

    // AI Logic: Estimate value based on damage type and property characteristics
    let estimatedValueCents = 0;
    let confidence = 0;
    let breakdown = {};

    // Base estimates by damage type (in cents)
    const damageTypeEstimates: Record<string, number> = {
      "Wind/Hail": 1500000, // $15,000
      Water: 800000, // $8,000
      Fire: 5000000, // $50,000
      Roof: 1200000, // $12,000
      Siding: 900000, // $9,000
      Interior: 500000, // $5,000
      Structural: 3000000, // $30,000
    };

    // Property type multipliers
    const propertyMultipliers: Record<string, number> = {
      "Single Family": 1.0,
      "Multi Family": 1.5,
      Commercial: 2.5,
      Condo: 0.7,
    };

    const baseEstimate = damageTypeEstimates[damageType || ""] || 1000000; // Default $10,000
    const multiplier = propertyMultipliers[propertyType || ""] || 1.0;

    estimatedValueCents = Math.floor(baseEstimate * multiplier);

    // Adjust for age of loss (older = potentially more complexity)
    if (dateOfLoss) {
      const daysSinceLoss = Math.floor(
        (Date.now() - new Date(dateOfLoss).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLoss > 30) {
        estimatedValueCents = Math.floor(estimatedValueCents * 1.2); // 20% increase for aged claims
      }
    }

    // Confidence based on available data
    confidence = 50; // Base confidence
    if (damageType) confidence += 20;
    if (propertyType) confidence += 15;
    if (dateOfLoss) confidence += 10;
    if (propertyAddress) confidence += 5;

    breakdown = {
      baseDamageEstimate: baseEstimate / 100,
      propertyTypeMultiplier: multiplier,
      ageAdjustment: dateOfLoss ? "Applied" : "None",
    };

    return NextResponse.json({
      estimatedValueCents,
      estimatedValueFormatted: `$${(estimatedValueCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      confidence,
      breakdown,
      disclaimer: "AI estimate based on typical damage patterns. Manual review recommended.",
    });
  } catch (error) {
    logger.error("[AI Estimate Value] Error:", error);
    return NextResponse.json({ error: "Failed to generate value estimate" }, { status: 500 });
  }
}

export const POST = withAiBilling(
  createAiConfig("estimate_value", { costPerRequest: 15 }),
  POST_INNER
);
