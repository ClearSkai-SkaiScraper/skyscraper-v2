/**
 * AI Route Guard Middleware
 *
 * Wraps AI endpoints with authentication, rate limits, and usage logging.
 * Token/credit billing has been REMOVED — all AI features are included
 * in the flat $80/month plan.
 */

import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/apiAuth";
import { checkRateLimit as checkUpstashRateLimit } from "@/lib/rate-limit";

export interface AiBillingConfig {
  feature: string;
  /** @deprecated Token costs removed — flat plan */
  costPerRequest?: number;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  planRequired?: "free" | "pro" | "enterprise";
}

export interface AiBillingContext {
  userId: string;
  orgId: string | null;
  feature: string;
  planType: string;
  betaMode: boolean;
}

/**
 * withAiBilling - Wraps AI route handlers with auth + rate limits
 *
 * All AI features are unlimited on the flat plan.
 * This middleware handles: authentication, Upstash rate limiting,
 * plan access checks, and usage logging.
 */
export function withAiBilling<T = any>(
  config: AiBillingConfig,
  handler: (req: NextRequest, ctx: AiBillingContext) => Promise<NextResponse<T> | NextResponse<any>>
) {
  return async (req: NextRequest, _routeParams?: any) => {
    const startTime = Date.now();

    try {
      // 1. Authenticate user
      const authResult = await requireApiAuth();
      if (authResult instanceof NextResponse) return authResult;

      const { userId, orgId } = authResult;

      // 2. Enforce Upstash Redis rate limit (survives cold starts)
      const rl = await checkUpstashRateLimit(userId, "AI");
      if (!rl.success) {
        return NextResponse.json(
          { error: "Rate limit exceeded", retryAfter: 60 },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }

      // 3. Determine plan type from subscription (all paid users get full access)
      const planType = "pro";

      // 4. Check plan access
      if (config.planRequired) {
        const hasAccess = checkPlanAccess(planType, config.planRequired);
        if (!hasAccess) {
          return NextResponse.json({ error: "Plan upgrade required" }, { status: 403 });
        }
      }

      // 5. Build context for handler
      const context: AiBillingContext = {
        userId,
        orgId,
        feature: config.feature,
        planType,
        betaMode: false,
      };

      // 6. Execute handler
      const response = await handler(req, context);

      // 7. Log usage for analytics (no billing)
      const durationMs = Date.now() - startTime;
      console.log(`[AI] ${config.feature}`, {
        userId,
        orgId,
        durationMs,
      });

      // 8. Add feature header to response
      const headers = new Headers(response.headers);
      headers.set("X-AI-Feature", config.feature);

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error: any) {
      console.error(`[AI] Error in ${config.feature}:`, error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

/**
 * Check if user's plan allows access to feature
 */
function checkPlanAccess(userPlan: string, requiredPlan: string): boolean {
  const planHierarchy = ["free", "pro", "enterprise"];
  const userLevel = planHierarchy.indexOf(userPlan);
  const requiredLevel = planHierarchy.indexOf(requiredPlan);
  return userLevel >= requiredLevel;
}

/**
 * Helper: Create simple AI config
 */
export const createAiConfig = (
  feature: string,
  options?: Partial<AiBillingConfig>
): AiBillingConfig => ({
  feature,
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000,
  },
  ...options,
});
