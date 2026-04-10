/**
 * AI Usage Tracking & Metering
 * Track token usage per org/feature for billing purposes
 *
 * BETA MODE: All tracking is disabled for open beta testing.
 * Re-enable when ready for production billing.
 */

import prisma from "@/lib/prisma"; // Re-enabled for compile

export interface AiUsageParams {
  orgId: string;
  feature: string;
  tokens: number;
  metadata?: Record<string, any>;
}

/**
 * Track AI token usage for an organization
 *
 * BETA: No-op for open beta testing - all AI features are free
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function trackAiUsage(params: AiUsageParams): Promise<void> {
  // BETA MODE: Skip all usage tracking
  // Users get unlimited AI access during beta testing
  if (process.env.BETA_MODE !== "false") {
    return; // No-op during beta
  }

  // Production tracking (disabled for now)
  // try {
  //   await prisma.AiUsageNew.create({
  //     data: {
  //       orgId: params.orgId,
  //       feature: params.feature,
  //       tokens: params.tokens,
  //       metadata: params.metadata || {},
  //     },
  //   });
  // } catch (error) {
  //   logger.error("Failed to track AI usage:", error);
  // }
}

/**
 * Get total tokens used by an org this month
 */
export async function getMonthlyUsage(orgId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const result = await prisma.ai_usage.aggregate({
    where: {
      org_id: orgId,
      created_at: {
        gte: startOfMonth,
      },
    },
    _sum: {
      tokens_used: true,
    },
  });

  return result._sum.tokens_used || 0;
}

/**
 * Get usage breakdown by feature for an org this month
 */
export async function getUsageByFeature(orgId: string): Promise<Record<string, number>> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usageRecords = await prisma.ai_usage.groupBy({
    by: ["bucket"],
    where: {
      org_id: orgId,
      created_at: {
        gte: startOfMonth,
      },
    },
    _sum: {
      tokens_used: true,
    },
  });

  const breakdown: Record<string, number> = {};
  for (const record of usageRecords) {
    breakdown[record.bucket] = record._sum.tokens_used || 0;
  }

  return breakdown;
}

/**
 * Check if org has exceeded their monthly AI token limit
 */
export async function checkAiLimit(
  orgId: string,
  monthlyLimit: number
): Promise<{ exceeded: boolean; used: number; limit: number; remaining: number }> {
  const used = await getMonthlyUsage(orgId);
  const remaining = Math.max(0, monthlyLimit - used);

  return {
    exceeded: used >= monthlyLimit,
    used,
    limit: monthlyLimit,
    remaining,
  };
}
