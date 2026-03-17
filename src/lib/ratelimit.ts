/**
 * Rate Limiting Configuration
 *
 * @deprecated This file is deprecated. Import from '@/lib/rate-limit' instead.
 *
 * ```typescript
 * import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit';
 * ```
 */

// Re-export everything from the canonical rate-limit module
export {
  checkRateLimit,
  checkRateLimitCustom,
  createRateLimitHeaders,
  getRateLimitIdentifier,
  RATE_LIMIT_PRESETS,
  type RateLimitPreset,
  type RateLimitResult,
} from "@/lib/rate-limit";

// Legacy compatibility export
export { checkRateLimit as checkRateLimitLegacy } from "@/lib/rate-limit";

/**
 * Format rate limit error message
 */
export function getRateLimitError(reset: number): string {
  const resetDate = new Date(reset);
  const now = new Date();
  const secondsUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / 1000);

  return `Rate limit exceeded. Please try again in ${secondsUntilReset} seconds.`;
}
