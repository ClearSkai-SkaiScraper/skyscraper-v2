/**
 * src/lib/ai/costGuard.ts
 *
 * AI Cost Guardrails — Per-org daily token ceiling.
 *
 * Tracks approximate token usage per organization per day using
 * Upstash Redis. When the daily ceiling is exceeded, AI requests
 * are soft-blocked with a clear error message.
 *
 * Usage:
 * ```typescript
 * import { aiCostGuard } from "@/lib/ai/costGuard";
 *
 * // Before calling OpenAI:
 * const allowed = await aiCostGuard.checkBudget(orgId);
 * if (!allowed.ok) return NextResponse.json({ error: allowed.reason }, { status: 429 });
 *
 * // After a successful call, record usage:
 * await aiCostGuard.recordUsage(orgId, promptTokens + completionTokens);
 * ```
 */

import { logger } from "@/lib/logger";

// ── Configuration ─────────────────────────────────────────────────
const DEFAULT_DAILY_TOKEN_CEILING = parseInt(process.env.AI_DAILY_TOKEN_CEILING || "500000", 10);

// Per-tier ceilings (tokens per day per org)
const TIER_CEILINGS: Record<string, number> = {
  free: 50_000,
  starter: 200_000,
  professional: 500_000,
  enterprise: 2_000_000,
};

// ── Redis helpers ─────────────────────────────────────────────────
function getRedisClient() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

async function redisGet(key: string): Promise<number> {
  const config = getRedisClient();
  if (!config) return 0;

  try {
    const res = await fetch(`${config.url}/get/${key}`, {
      headers: { Authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return parseInt(data.result || "0", 10);
  } catch {
    return 0; // Redis unreachable → allow request (fail-open)
  }
}

async function redisIncrBy(key: string, amount: number, ttlSeconds: number): Promise<number> {
  const config = getRedisClient();
  if (!config) return 0;

  try {
    // Pipeline: INCRBY + EXPIRE (only set TTL if key is new)
    const pipeline = [
      ["INCRBY", key, amount.toString()],
      ["EXPIRE", key, ttlSeconds.toString(), "NX"],
    ];

    const res = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipeline),
      signal: AbortSignal.timeout(2000),
    });

    if (!res.ok) return 0;
    const data = await res.json();
    // Pipeline returns array of results; first is INCRBY result
    return parseInt(data?.[0]?.result || "0", 10);
  } catch {
    return 0; // Redis unreachable → fail-open
  }
}

// ── Key generation ────────────────────────────────────────────────
function dailyKey(orgId: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `ai:tokens:${orgId}:${date}`;
}

// Seconds until midnight UTC
function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

// ── Public API ────────────────────────────────────────────────────

interface BudgetCheckResult {
  ok: boolean;
  reason?: string;
  used: number;
  ceiling: number;
  remainingTokens: number;
}

export const aiCostGuard = {
  /**
   * Check whether an org is within its daily AI token budget.
   * Fail-open: if Redis is unavailable, requests are allowed.
   */
  async checkBudget(orgId: string, tier: string = "professional"): Promise<BudgetCheckResult> {
    const ceiling = TIER_CEILINGS[tier] ?? DEFAULT_DAILY_TOKEN_CEILING;
    const used = await redisGet(dailyKey(orgId));
    const remaining = Math.max(0, ceiling - used);

    if (used >= ceiling) {
      logger.warn("[AI_COST_GUARD] Budget exceeded", {
        orgId,
        used,
        ceiling,
        tier,
      });

      return {
        ok: false,
        reason: `Daily AI token limit reached (${used.toLocaleString()} / ${ceiling.toLocaleString()}). Resets at midnight UTC.`,
        used,
        ceiling,
        remainingTokens: 0,
      };
    }

    return { ok: true, used, ceiling, remainingTokens: remaining };
  },

  /**
   * Record token usage after a successful AI call.
   */
  async recordUsage(orgId: string, tokensUsed: number): Promise<void> {
    if (tokensUsed <= 0) return;

    const key = dailyKey(orgId);
    const ttl = secondsUntilMidnight();
    const newTotal = await redisIncrBy(key, tokensUsed, ttl);

    const ceiling = DEFAULT_DAILY_TOKEN_CEILING;
    const pct = Math.round((newTotal / ceiling) * 100);

    // Log warning thresholds
    if (pct >= 90 && pct < 100) {
      logger.warn("[AI_COST_GUARD] 90% budget consumed", {
        orgId,
        used: newTotal,
        ceiling,
      });
    } else if (pct >= 100) {
      logger.warn("[AI_COST_GUARD] Budget exceeded after recording", {
        orgId,
        used: newTotal,
        ceiling,
      });
    }
  },

  /**
   * Get current usage for an org (for admin dashboards).
   */
  async getUsage(orgId: string): Promise<{ used: number; ceiling: number; pct: number }> {
    const ceiling = DEFAULT_DAILY_TOKEN_CEILING;
    const used = await redisGet(dailyKey(orgId));
    return { used, ceiling, pct: Math.round((used / ceiling) * 100) };
  },
};
