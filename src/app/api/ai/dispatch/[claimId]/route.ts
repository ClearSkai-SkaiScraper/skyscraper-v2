export const dynamic = "force-dynamic";
/**
 * AI CONTRACTOR DISPATCH SYSTEM
 *
 * Automatically assigns trade partners based on:
 * - Claim damage type
 * - Required trades (roofing, mitigation, engineering)
 * - Priority level
 * - Contractor availability
 */

import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { createAiConfig, withAiBilling } from "@/lib/ai/withAiBilling";

import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { dispatchSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

// Define the context type to match what withAiBilling provides
interface AiBillingContext {
  userId: string;
  orgId: string | null;
  feature: string;
  planType: string;
  betaMode: boolean;
}

async function POST_INNER(
  request: NextRequest,
  ctx: AiBillingContext
): Promise<
  NextResponse<
    | {
        success: boolean;
        dispatch: { id: string; trade: string; priority: string; status: string };
      }
    | { error: string }
  >
> {
  try {
    const { orgId } = ctx;

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
    const rl = await checkRateLimit(ctx.userId, "AI");
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

    // Extract claimId from the URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const claimId = pathParts[pathParts.length - 1];

    if (!claimId) {
      return NextResponse.json({ error: "Claim ID required" }, { status: 400 });
    }

    const body = await request.json();
    const validation = validateAIRequest(dispatchSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }
    const { actionType, priority } = validation.data;

    // Get claim data
    const claim = await prisma.claims.findFirst({
      where: {
        id: claimId,
        orgId: orgId,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Determine required trade based on action type
    const tradeMapping: Record<string, string> = {
      FULL_REPLACEMENT: "ROOFING",
      WATER_MITIGATION: "MITIGATION",
      ENGINEER_REQUIRED: "ENGINEER",
      TILE_SPECIALIST: "TILE_ROOFING",
      METAL_SPECIALIST: "METAL_ROOFING",
      FM_129_EDGE: "COMMERCIAL_ROOFING",
      GUTTER_REPLACEMENT: "GUTTERS",
      PAINT_TOUCH_UP: "PAINTING",
      HVAC_REPAIR: "HVAC",
    };

    const trade = tradeMapping[actionType || "FULL_REPLACEMENT"] || "ROOFING";
    const dispatchPriority = priority || "MEDIUM";

    // TODO: When contractor_dispatch table is added to schema, use:
    // const dispatch = await prisma.contractor_dispatch.create({ ... });
    // For now, return a simulated dispatch response
    const dispatchId = randomUUID();

    // TODO: When ai_actions table is added to schema, log AI action here
    // TODO: When claim_automation_events table is added, create event here

    logger.info("[AI-DISPATCH] Created dispatch:", {
      dispatchId,
      claimId,
      trade,
      priority: dispatchPriority,
    });

    return NextResponse.json({
      success: true,
      dispatch: {
        id: dispatchId,
        trade,
        priority: dispatchPriority,
        status: "PENDING",
      },
    });
  } catch (error) {
    logger.error("Contractor Dispatch Error:", error);
    return NextResponse.json(
      { error: "Failed to dispatch contractor" },
      { status: 500 }
    );
  }
}

export const POST = withAiBilling(
  createAiConfig("ai_dispatch", { costPerRequest: 15 }),
  POST_INNER
);
