export const dynamic = "force-dynamic";

/**
 * Domain Adaptation AI Endpoint
 *
 * POST /api/ai/domain
 *
 * Specialized endpoint for domain adaptation tasks:
 * - Domain alignment
 * - Transfer learning
 * - Feature adaptation
 * - Cross-domain generalization
 */

import { NextRequest, NextResponse } from "next/server";

import { AICoreRouter } from "@/lib/ai/router";
import { type AiBillingContext, createAiConfig, withAiBilling } from "@/lib/ai/withAiBilling";
import { withAuth } from "@/lib/auth/withAuth";
import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { domainSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

async function POST_INNER(request: NextRequest, ctx: AiBillingContext) {
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

    const body = await request.json();
    const validation = validateAIRequest(domainSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          details: validation.details,
        },
        { status: 400 }
      );
    }
    const { action, payload } = validation.data;

    // Route to appropriate domain task
    const task = `adaptation.${action}`;
    const result = await AICoreRouter(task, payload);

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    logger.error("[Domain Adaptation AI] Error:", error);

    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/ai/domain
 *
 * Returns available domain adaptation capabilities
 */
export const GET = withAuth(async (_req, { userId }) => {
  try {
    return NextResponse.json({
      success: true,
      module: "domain-adaptation",
      capabilities: [
        "align - Align source and target domains",
        "transfer - Transfer learning across domains",
        "adaptFeatures - Adapt feature representations",
        "measureShift - Measure domain shift magnitude",
        "findMapping - Find optimal domain mapping",
        "validateAdaptation - Validate adaptation quality",
      ],
      usage: {
        endpoint: "/api/ai/domain",
        method: "POST",
        body: {
          action: "align | transfer | adaptFeatures | ...",
          payload: {
            source: "Source domain data",
            target: "Target domain data",
          },
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
});

export const POST = withAiBilling(
  createAiConfig("domain_analysis", { costPerRequest: 10 }),
  POST_INNER
);
