/**
 * AI Rate Limiting
 * Prevent abuse of AI-powered endpoints
 */

import { Redis } from "@upstash/redis";

// Upstash Redis for production, in-memory for dev
// eslint-disable-next-line no-restricted-syntax
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      // eslint-disable-next-line no-restricted-syntax
      url: process.env.UPSTASH_REDIS_REST_URL,
      // eslint-disable-next-line no-restricted-syntax
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// In-memory fallback for development
const memoryStore = new Map<string, { count: number; resetAt: number }>();

type RateLimitConfig = {
  maxRequests: number;
  windowMinutes: number;
};

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "ai-report-generation": { maxRequests: 10, windowMinutes: 60 },
  "ai-assistant-query": { maxRequests: 50, windowMinutes: 60 },
  "ai-supplement": { maxRequests: 20, windowMinutes: 60 },
};

/**
 * Check if user has exceeded rate limit
 */
export async function checkRateLimit(
  userId: string,
  endpoint: keyof typeof RATE_LIMITS
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
  const config = RATE_LIMITS[endpoint];
  if (!config) {
    throw new Error(`Unknown endpoint: ${endpoint}`);
  }

  const key = `ratelimit:${endpoint}:${userId}`;
  const now = Date.now();
  const windowMs = config.windowMinutes * 60 * 1000;
  const resetAt = new Date(now + windowMs);

  if (redis) {
    // Use Upstash Redis
    const current = await redis.get<number>(key);

    if (!current) {
      // First request in window
      await redis.set(key, 1, { px: windowMs });
      return { allowed: true, remaining: config.maxRequests - 1, resetAt };
    }

    if (current >= config.maxRequests) {
      const ttl = await redis.ttl(key);
      const resetTime = new Date(now + ttl * 1000);
      return { allowed: false, remaining: 0, resetAt: resetTime };
    }

    // Increment counter
    await redis.incr(key);
    return { allowed: true, remaining: config.maxRequests - current - 1, resetAt };
  } else {
    // Use in-memory fallback (dev only)
    const stored = memoryStore.get(key);

    if (!stored || stored.resetAt < now) {
      // New window
      memoryStore.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: config.maxRequests - 1, resetAt };
    }

    if (stored.count >= config.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: new Date(stored.resetAt) };
    }

    // Increment
    stored.count++;
    return { allowed: true, remaining: config.maxRequests - stored.count, resetAt };
  }
}

/**
 * Consume rate limit (call after successful request)
 */
export async function consumeRateLimit(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  endpoint: keyof typeof RATE_LIMITS
): Promise<void> {
  // Already handled in checkRateLimit
  return;
}

/**
 * Get current usage for user
 */
export async function getRateLimitUsage(
  userId: string,
  endpoint: keyof typeof RATE_LIMITS
): Promise<{
  used: number;
  limit: number;
  resetAt: Date;
}> {
  const config = RATE_LIMITS[endpoint];
  const key = `ratelimit:${endpoint}:${userId}`;
  const now = Date.now();
  const windowMs = config.windowMinutes * 60 * 1000;

  if (redis) {
    const current = (await redis.get<number>(key)) || 0;
    const ttl = (await redis.ttl(key)) || windowMs / 1000;
    const resetAt = new Date(now + ttl * 1000);

    return { used: current, limit: config.maxRequests, resetAt };
  } else {
    const stored = memoryStore.get(key);
    if (!stored || stored.resetAt < now) {
      return { used: 0, limit: config.maxRequests, resetAt: new Date(now + windowMs) };
    }
    return { used: stored.count, limit: config.maxRequests, resetAt: new Date(stored.resetAt) };
  }
}
