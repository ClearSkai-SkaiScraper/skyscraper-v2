/**
 * Security Rate Limiting
 *
 * @deprecated This file is deprecated. Import from '@/lib/rate-limit' instead.
 *
 * ```typescript
 * import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit';
 *
 * // Check rate limit with preset
 * const result = await checkRateLimit(userId, 'AI');
 * ```
 */

// Re-export from canonical module
export {
  checkRateLimit,
  createRateLimitHeaders,
  RATE_LIMIT_PRESETS,
  type RateLimitPreset,
  type RateLimitResult,
} from "@/lib/rate-limit";

// Legacy compatibility - maps old limiter names to new presets
export const rateLimiters = {
  publicLeads: "PUBLIC",
  ai: "AI",
  apiKeys: "API_KEYS",
  api: "API",
  webhooks: "WEBHOOK",
} as const;

/**
 * Get client identifier from request (IP address or user ID)
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  if (userId) return userId;

  // Try to get IP from headers
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return forwarded?.split(",")[0] || realIp || "anonymous";
}
