/**
 * Rate Limiting Middleware
 *
 * @deprecated This file is deprecated. Import from '@/lib/rate-limit' instead.
 *
 * ```typescript
 * import { checkRateLimit, RATE_LIMIT_PRESETS, createRateLimitHeaders } from '@/lib/rate-limit';
 * ```
 */

// Re-export from canonical module
export {
  checkRateLimit,
  checkRateLimitCustom,
  createRateLimitHeaders,
  getRateLimitIdentifier,
  RATE_LIMIT_PRESETS,
  RATE_LIMIT_PRESETS as RATE_LIMITS,
  type RateLimitResult,
} from "@/lib/rate-limit";
