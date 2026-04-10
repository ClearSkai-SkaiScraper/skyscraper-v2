import { ClaimContext } from "@/lib/claim/buildClaimContext";
import { logger } from "@/lib/logger";
import { logCacheOperation } from "@/lib/observability/logger";
import { recordCacheStat } from "@/lib/telemetry";
import { createRedisClientSafely } from "@/lib/upstash";

/**
 * Cache layer for buildClaimContext
 * Reduces database queries for frequently accessed claims
 * TTL: 5 minutes (300 seconds)
 */

const CACHE_TTL_SECONDS = 300; // 5 minutes
const CACHE_PREFIX = "claim_context:";

/**
 * Get claim context from cache
 * Returns null if not cached or Redis unavailable
 */
export async function getCachedClaimContext(claimId: string): Promise<ClaimContext | null> {
  const redis = createRedisClientSafely();
  if (!redis) return null;

  try {
    const startTime = Date.now();
    const cached = await redis.get<ClaimContext>(`${CACHE_PREFIX}${claimId}`);
    const duration = Date.now() - startTime;

    logCacheOperation({
      operation: cached ? "hit" : "miss",
      key: `claim_context:${claimId}`,
      duration,
    });

    await recordCacheStat({
      orgId: null,
      cacheName: "claim_context",
      op: "get",
      hit: !!cached,
      key: `claim_context:${claimId}`,
      ttlSeconds: CACHE_TTL_SECONDS,
      durationMs: duration,
    });

    return cached;
  } catch (error) {
    logger.error("[CACHE] Failed to get claim context:", error);
    return null;
  }
}

/**
 * Cache claim context
 * Fails silently if Redis unavailable
 */
export async function setCachedClaimContext(claimId: string, context: ClaimContext): Promise<void> {
  const redis = createRedisClientSafely();
  if (!redis) return;

  try {
    const startTime = Date.now();
    await redis.setex(`${CACHE_PREFIX}${claimId}`, CACHE_TTL_SECONDS, JSON.stringify(context));

    await recordCacheStat({
      orgId: null,
      cacheName: "claim_context",
      op: "set",
      hit: null,
      key: `claim_context:${claimId}`,
      ttlSeconds: CACHE_TTL_SECONDS,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    logger.error("[CACHE] Failed to cache claim context:", error);
  }
}

/**
 * Invalidate claim context cache
 * Call this when claim data changes (scopes imported, evidence added, etc.)
 */
export async function invalidateClaimContext(claimId: string): Promise<void> {
  const redis = createRedisClientSafely();
  if (!redis) return;

  try {
    await redis.del(`${CACHE_PREFIX}${claimId}`);

    logCacheOperation({
      operation: "invalidate",
      key: `claim_context:${claimId}`,
    });
  } catch (error) {
    logger.error("[CACHE] Failed to invalidate claim context:", error);
  }
}

/**
 * Invalidate all claim context caches for an organization
 * Use when org-level data changes (templates, branding, etc.)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function invalidateOrgClaimContexts(orgId: string): Promise<void> {
  const redis = createRedisClientSafely();
  if (!redis) return;

  try {
    // Scan for all claim context keys and filter by orgId
    // Note: This is expensive, use sparingly
    const keys = await redis.keys(`${CACHE_PREFIX}*`);
    if (keys.length === 0) return;

    // Delete all claim context keys
    // We don't have orgId in the key, so we delete all claim contexts
    // More precise approach would be to store orgId in the key
    await redis.del(...keys);
  } catch (error) {
    logger.error("[CACHE] Failed to invalidate org claim contexts:", error);
  }
}

/**
 * Get cache statistics for monitoring
 */
export async function getClaimContextCacheStats(): Promise<{
  cachedClaims: number;
  totalMemory?: number;
}> {
  const redis = createRedisClientSafely();
  if (!redis) return { cachedClaims: 0 };

  try {
    const keys = await redis.keys(`${CACHE_PREFIX}*`);
    return {
      cachedClaims: keys.length,
    };
  } catch (error) {
    logger.error("[CACHE] Failed to get cache stats:", error);
    return { cachedClaims: 0 };
  }
}
