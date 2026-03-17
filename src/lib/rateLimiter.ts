/**
 * Simple in-memory rate limiter
 *
 * @deprecated This file is deprecated. Import from '@/lib/rate-limit' instead.
 *
 * ```typescript
 * import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit';
 * ```
 */

// Re-export from canonical module
export { checkRateLimitCustom as checkRateLimit,RATE_LIMIT_PRESETS } from "@/lib/rate-limit";

// Legacy type exports for backward compatibility
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const rateLimits = {
  AI: { maxRequests: 10, windowMs: 60 * 1000 },
  UPLOAD: { maxRequests: 20, windowMs: 60 * 1000 },
  API: { maxRequests: 100, windowMs: 60 * 1000 },
};

export const RateLimits = {
  PDF_GENERATION: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  AI_ASSISTANT: { maxRequests: 50, windowMs: 60 * 60 * 1000 },
  MOCKUPS: { maxRequests: 20, windowMs: 60 * 60 * 1000 },
  SUPPLEMENTS: { maxRequests: 15, windowMs: 60 * 60 * 1000 },
} as const;
