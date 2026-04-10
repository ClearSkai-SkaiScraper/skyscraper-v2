/**
 * PHASE 34: AI PERFORMANCE LOGGING & COST TRACKING
 *
 * Tracks every AI call with:
 * - Duration
 * - Model used
 * - Tokens consumed
 * - Cache hits/misses
 * - Cost estimates
 * - Route/org/lead context
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type AIModel = "gpt-4o" | "gpt-4o-mini";

export interface AIPerformanceMetrics {
  routeName: string;
  orgId: string;
  leadId?: string;
  claimId?: string;
  durationMs: number;
  model: AIModel;
  tokensIn: number;
  tokensOut: number;
  cacheHit: boolean;
  error?: string;
}

// Cost per 1K tokens (as of Nov 2024)
const MODEL_COSTS: Record<AIModel, { input: number; output: number }> = {
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
};

/**
 * Calculate cost in USD for AI call
 */
export function calculateCost(model: AIModel, tokensIn: number, tokensOut: number): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS["gpt-4o-mini"];
  const inputCost = (tokensIn / 1000) * costs.input;
  const outputCost = (tokensOut / 1000) * costs.output;
  return inputCost + outputCost;
}

/**
 * Log AI performance to database
 */
export async function logAIPerformance(metrics: AIPerformanceMetrics): Promise<void> {
  try {
    const costUsd = calculateCost(metrics.model, metrics.tokensIn, metrics.tokensOut);

    const { randomUUID } = await import("crypto");
    await prisma.ai_performance_logs.create({
      data: {
        id: randomUUID(),
        route: metrics.routeName,
        org_id: metrics.orgId,
        lead_id: metrics.leadId || null,
        claim_id: metrics.claimId || null,
        duration_ms: metrics.durationMs,
        model: metrics.model,
        tokens_in: metrics.tokensIn,
        tokens_out: metrics.tokensOut,
        cache_hit: metrics.cacheHit,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cost_usd: costUsd as any,
        error: metrics.error || null,
      },
    });

    logger.info(
      `[AI_PERF] Logged: ${metrics.routeName} | ${metrics.durationMs}ms | ${metrics.cacheHit ? "CACHED" : "MISS"} | $${costUsd.toFixed(4)}`
    );
  } catch (error) {
    logger.error("[AI Perf] Error logging performance:", error);
  }
}

/**
 * Wrapper function that automatically tracks performance
 *
 * Usage:
 *   const result = await trackPerformance(
 *     {
 *       routeName: 'skai',
 *       orgId: '123',
 *       leadId: '456',
 *       model: 'gpt-4o-mini',
 *       cacheHit: false,
 *     },
 *     async (tracker) => {
 *       const response = await openai.chat.completions.create(...);
 *       tracker.setTokens(response.usage);
 *       return response;
 *     }
 *   );
 */
export async function trackPerformance<T>(
  context: {
    routeName: string;
    orgId: string;
    leadId?: string;
    claimId?: string;
    model: AIModel;
    cacheHit: boolean;
  },
  fn: (tracker: PerformanceTracker) => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const tracker = new PerformanceTracker();

  try {
    const result = await fn(tracker);
    const durationMs = Date.now() - startTime;

    await logAIPerformance({
      ...context,
      durationMs,
      tokensIn: tracker.tokensIn,
      tokensOut: tracker.tokensOut,
    });

    return result;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    await logAIPerformance({
      ...context,
      durationMs,
      tokensIn: tracker.tokensIn,
      tokensOut: tracker.tokensOut,
      error: error.message,
    });

    throw error;
  }
}

/**
 * Helper class for tracking tokens during execution
 */
export class PerformanceTracker {
  tokensIn = 0;
  tokensOut = 0;

  setTokens(usage: { prompt_tokens: number; completion_tokens: number }): void {
    this.tokensIn = usage.prompt_tokens;
    this.tokensOut = usage.completion_tokens;
  }

  addTokens(tokensIn: number, tokensOut: number): void {
    this.tokensIn += tokensIn;
    this.tokensOut += tokensOut;
  }
}

/**
 * Get performance stats for org
 */
export async function getOrgPerformanceStats(
  orgId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalCalls: number;
  totalCost: number;
  avgDuration: number;
  cacheHitRate: number;
  topRoutes: { route: string; count: number; cost: number }[];
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { org_id: orgId };

  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at.gte = startDate;
    if (endDate) where.created_at.lte = endDate;
  }

  const logs = await prisma.ai_performance_logs.findMany({ where });

  const totalCalls = logs.length;
  const totalCost = logs.reduce((sum, log) => sum + (Number(log.cost_usd) || 0), 0);
  const avgDuration =
    totalCalls > 0 ? logs.reduce((sum, log) => sum + Number(log.duration_ms), 0) / totalCalls : 0;
  const cacheHits = logs.filter((log) => log.cache_hit).length;
  const cacheHitRate = totalCalls > 0 ? (cacheHits / totalCalls) * 100 : 0;

  // Group by route
  const routeStats = new Map<string, { count: number; cost: number }>();
  for (const log of logs) {
    const existing = routeStats.get(log.route) || { count: 0, cost: 0 };
    routeStats.set(log.route, {
      count: existing.count + 1,
      cost: existing.cost + (Number(log.cost_usd) || 0),
    });
  }

  const topRoutes = Array.from(routeStats.entries())
    .map(([route, stats]) => ({ route, ...stats }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);

  return {
    totalCalls,
    totalCost,
    avgDuration,
    cacheHitRate,
    topRoutes,
  };
}
