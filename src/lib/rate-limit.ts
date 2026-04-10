/**
 * Rate Limiting Utility (CANONICAL)
 *
 * Uses Upstash Redis for distributed rate limiting across serverless functions.
 * Falls back to in-memory for development without Redis.
 *
 * This is the SINGLE rate limiting module for the entire application.
 * All other rate limiter files redirect here.
 *
 * Usage:
 * ```typescript
 * import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit';
 *
 * const result = await checkRateLimit(userId, 'AI');
 * if (!result.success) {
 *   return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
 * }
 * ```
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { logger } from "@/lib/logger";

// ============================================================================
// CONFIGURATION
// ============================================================================

// Initialize Upstash Redis client
const redis =
  // eslint-disable-next-line no-restricted-syntax
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        // eslint-disable-next-line no-restricted-syntax
        url: process.env.UPSTASH_REDIS_REST_URL,
        // eslint-disable-next-line no-restricted-syntax
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Fallback in-memory rate limiter for development
const memoryStore = new Map<string, { count: number; resetAt: number }>();

// Cleanup old entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of memoryStore.entries()) {
        if (entry.resetAt < now) {
          memoryStore.delete(key);
        }
      }
    },
    5 * 60 * 1000
  );
}

// ============================================================================
// RATE LIMIT PRESETS
// ============================================================================

export const RATE_LIMIT_PRESETS = {
  /** AI endpoints: 10 requests per minute per user */
  AI: { limit: 10, windowMs: 60 * 1000, windowSeconds: 60 },
  /** Upload endpoints: 20 requests per minute */
  UPLOAD: { limit: 20, windowMs: 60 * 1000, windowSeconds: 60 },
  /** Weather API: 30 requests per minute */
  WEATHER: { limit: 30, windowMs: 60 * 1000, windowSeconds: 60 },
  /** General API: 100 requests per minute */
  API: { limit: 100, windowMs: 60 * 1000, windowSeconds: 60 },
  /** Webhook endpoints: 50 requests per minute */
  WEBHOOK: { limit: 50, windowMs: 60 * 1000, windowSeconds: 60 },
  /** Public lead forms: 5 requests per minute (strict) */
  PUBLIC: { limit: 5, windowMs: 60 * 1000, windowSeconds: 60 },
  /** Auth endpoints: 10 requests per minute */
  AUTH: { limit: 10, windowMs: 60 * 1000, windowSeconds: 60 },
  /** Migration API: 3 requests per minute (prevent runaway imports) */
  MIGRATION: { limit: 3, windowMs: 60 * 1000, windowSeconds: 60 },
  /** API key generation: 10 requests per hour */
  API_KEYS: { limit: 10, windowMs: 60 * 60 * 1000, windowSeconds: 3600 },
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMIT_PRESETS;

// ============================================================================
// UPSTASH RATELIMIT INSTANCES (for enhanced features)
// ============================================================================

const upstashLimiters = redis
  ? {
      AI: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        analytics: true,
        prefix: "@upstash/ratelimit:ai",
      }),
      API: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "1 m"),
        analytics: true,
        prefix: "@upstash/ratelimit:api",
      }),
      WEBHOOK: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(50, "1 m"),
        analytics: true,
        prefix: "@upstash/ratelimit:webhooks",
      }),
      PUBLIC: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 m"),
        analytics: true,
        prefix: "@upstash/ratelimit:public",
      }),
      API_KEYS: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        analytics: true,
        prefix: "@upstash/ratelimit:api-keys",
      }),
    }
  : null;

// ============================================================================
// MAIN RATE LIMIT FUNCTION
// ============================================================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for an identifier using a preset
 *
 * @param identifier - User ID, IP address, or other unique identifier
 * @param preset - Rate limit preset name (AI, API, WEBHOOK, etc.)
 * @returns RateLimitResult with success status and limit info
 */
export async function checkRateLimit(
  identifier: string,
  preset: RateLimitPreset = "API"
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_PRESETS[preset];

  // Try Upstash Ratelimit first (if available for this preset)
  if (upstashLimiters && preset in upstashLimiters) {
    try {
      const limiter = upstashLimiters[preset as keyof typeof upstashLimiters];
      const result = await limiter.limit(identifier);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (error) {
      logger.error(`[RateLimit] Upstash error for ${preset}:`, error);
      // Fall through to manual check
    }
  }

  // Fall back to manual Redis check or in-memory
  if (redis) {
    return checkRedisLimit(identifier, config.limit, config.windowMs);
  }

  return checkMemoryLimitWithInfo(identifier, config.limit, config.windowMs);
}

/**
 * Check rate limit with custom config
 */
export async function checkRateLimitCustom(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (redis) {
    return checkRedisLimit(identifier, limit, windowMs);
  }
  return checkMemoryLimitWithInfo(identifier, limit, windowMs);
}

// ============================================================================
// REDIS IMPLEMENTATION
// ============================================================================

async function checkRedisLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get current count
    const requests = await redis!.zcount(key, windowStart, now);

    if (requests >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: now + windowMs,
      };
    }

    // Add current request
    await redis!.zadd(key, { score: now, member: `${now}-${crypto.randomUUID()}` });
    await redis!.expire(key, Math.ceil(windowMs / 1000));
    await redis!.zremrangebyscore(key, 0, windowStart);

    return {
      success: true,
      limit,
      remaining: limit - requests - 1,
      reset: now + windowMs,
    };
  } catch (error) {
    logger.error("[RateLimit] Redis error:", error);
    // Fail open for availability
    return { success: true, limit, remaining: limit, reset: Date.now() + windowMs };
  }
}

// ============================================================================
// IN-MEMORY IMPLEMENTATION (Development Fallback)
// ============================================================================

function checkMemoryLimitWithInfo(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(identifier);

  // Clean up expired
  if (entry && entry.resetAt < now) {
    memoryStore.delete(identifier);
  }

  const current = memoryStore.get(identifier);

  if (!current) {
    memoryStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }

  if (current.count >= limit) {
    return { success: false, limit, remaining: 0, reset: current.resetAt };
  }

  current.count++;
  return { success: true, limit, remaining: limit - current.count, reset: current.resetAt };
}

// ============================================================================
// LEGACY COMPATIBILITY (DEPRECATED - use checkRateLimit instead)
// ============================================================================

interface RateLimitOptions {
  interval: number;
  uniqueTokenPerInterval?: number;
}

/**
 * @deprecated Use checkRateLimit(identifier, preset) instead
 */
export function rateLimit(options: RateLimitOptions) {
  const { interval } = options;

  return {
    check: async (limit: number, token: string): Promise<boolean> => {
      const result = await checkRateLimitCustom(token, limit, interval);
      return result.success;
    },
    remaining: async (limit: number, token: string): Promise<number> => {
      if (redis) {
        const key = `rate_limit:${token}`;
        const now = Date.now();
        const windowStart = now - interval;
        const count = await redis.zcount(key, windowStart, now);
        return Math.max(0, limit - count);
      }
      const entry = memoryStore.get(token);
      if (!entry || entry.resetAt < Date.now()) return limit;
      return Math.max(0, limit - entry.count);
    },
  };
}

/**
 * @deprecated Use checkRateLimit instead
 */
export const rateLimiters = {
  ai: rateLimit({ interval: 60 * 1000 }),
  uploads: rateLimit({ interval: 60 * 1000 }),
  weather: rateLimit({ interval: 60 * 1000 }),
  api: rateLimit({ interval: 60 * 1000 }),
};

/**
 * @deprecated Use checkRateLimit instead
 */
export function simpleSlidingWindowLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const result = checkMemoryLimitWithInfo(key, limit, windowMs);
  return { success: result.success, remaining: result.remaining };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Extract rate limit identifier from request
 * Prefers userId, falls back to IP address
 */
export function getRateLimitIdentifier(userId: string | null, req: Request): string {
  if (userId) return userId;
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "anonymous";
  return ip;
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
}
