export const dynamic = "force-dynamic";

/**
 * Multi-Agent AI Endpoint
 *
 * POST /api/ai/agents
 *
 * Specialized endpoint for multi-agent reinforcement learning:
 * - Policy optimization
 * - Workflow coordination
 * - Resource allocation
 * - Action planning
 */

import { logger } from "@/lib/observability/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { AICoreRouter } from "@/lib/ai/router";
import { createAiConfig, withAiBilling, type AiBillingContext } from "@/lib/ai/withAiBilling";
import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import { checkRateLimit } from "@/lib/rate-limit";
import { agentsSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

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
    const validation = validateAIRequest(agentsSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error, details: validation.details },
        { status: 400 }
      );
    }
    const { action, payload } = validation.data;

    // Validate payload
    if (!payload || !payload.context) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing context in payload.",
          required: {
            context: "Current state and environment information",
          },
        },
        { status: 400 }
      );
    }

    // Route to appropriate agent task
    const task = `multi-agent.${action}`;
    const result = await AICoreRouter(task, payload);

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    logger.error("[Multi-Agent AI] Error:", error);

    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/ai/agents
 *
 * Returns available multi-agent capabilities
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      module: "multi-agent",
      capabilities: [
        "optimizePolicy - Optimize multi-agent policy",
        "coordinateWorkflow - Coordinate workflow between agents",
        "allocateResources - Allocate resources optimally",
        "planActions - Plan next-best actions",
        "evaluateStrategy - Evaluate strategy effectiveness",
        "adaptBehavior - Adapt agent behavior based on environment",
      ],
      usage: {
        endpoint: "/api/ai/agents",
        method: "POST",
        body: {
          action: "optimizePolicy | coordinateWorkflow | ...",
          payload: {
            context: "Current state and environment",
            goals: ["array of objectives"],
          },
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export const POST = withAiBilling(createAiConfig("ai_agents", { costPerRequest: 20 }), POST_INNER);
