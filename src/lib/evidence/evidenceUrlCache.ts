/**
 * Evidence URL Cache
 *
 * Caches signed URLs to reduce Supabase API calls.
 * Signed URLs are valid for 7 days by default, so we cache them for 6 days to be safe.
 */

import { logger } from "@/lib/logger";
import { logCacheOperation } from "@/lib/observability/logger";
import { recordCacheStat } from "@/lib/telemetry";
import { getUpstashRedis } from "@/lib/upstash";

const CACHE_TTL = 60 * 60 * 24 * 6; // 6 days (signed URLs valid for 7)
const CACHE_PREFIX = "evidence_url:";

interface CachedUrl {
  url: string;
  expiresAt: number; // Timestamp when signed URL expires
}

/**
 * Get cached signed URL if available and not expired
 */
export async function getCachedEvidenceUrl(storagePath: string): Promise<string | null> {
  try {
    const redis = getUpstashRedis();
    if (!redis) return null;

    const startTime = Date.now();
    const cached = await redis.get<CachedUrl>(`${CACHE_PREFIX}${storagePath}`);

    if (!cached) {
      logCacheOperation({
        operation: "miss",
        key: `evidence_url:${storagePath}`,
        duration: Date.now() - startTime,
      });

      await recordCacheStat({
        orgId: null,
        cacheName: "evidence_url",
        op: "get",
        hit: false,
        key: `evidence_url:${storagePath}`,
        ttlSeconds: CACHE_TTL,
        durationMs: Date.now() - startTime,
      });
      return null;
    }

    // Check if URL is still valid (with 1 hour safety buffer)
    const now = Date.now();
    if (cached.expiresAt < now + 60 * 60 * 1000) {
      // URL expires within 1 hour, treat as miss
      logCacheOperation({
        operation: "miss",
        key: `evidence_url:${storagePath}`,
        duration: Date.now() - startTime,
      });

      await recordCacheStat({
        orgId: null,
        cacheName: "evidence_url",
        op: "get",
        hit: false,
        key: `evidence_url:${storagePath}`,
        ttlSeconds: CACHE_TTL,
        durationMs: Date.now() - startTime,
        meta: { reason: "expired" },
      });
      return null;
    }

    logCacheOperation({
      operation: "hit",
      key: `evidence_url:${storagePath}`,
      duration: Date.now() - startTime,
    });

    await recordCacheStat({
      orgId: null,
      cacheName: "evidence_url",
      op: "get",
      hit: true,
      key: `evidence_url:${storagePath}`,
      ttlSeconds: CACHE_TTL,
      durationMs: Date.now() - startTime,
    });

    return cached.url;
  } catch (error) {
    logger.error("[getCachedEvidenceUrl] Error:", error);
    return null;
  }
}

/**
 * Cache a signed URL
 */
export async function setCachedEvidenceUrl(
  storagePath: string,
  signedUrl: string,
  expiresIn: number = 60 * 60 * 24 * 7
): Promise<void> {
  try {
    const redis = getUpstashRedis();
    if (!redis) return;

    const startTime = Date.now();
    const expiresAt = Date.now() + expiresIn * 1000;

    const cached: CachedUrl = {
      url: signedUrl,
      expiresAt,
    };

    // Cache for 6 days (1 day less than signed URL TTL for safety)
    await redis.set(`${CACHE_PREFIX}${storagePath}`, JSON.stringify(cached), {
      ex: CACHE_TTL,
    });

    logCacheOperation({
      operation: "set",
      key: `evidence_url:${storagePath}`,
      duration: Date.now() - startTime,
    });

    await recordCacheStat({
      orgId: null,
      cacheName: "evidence_url",
      op: "set",
      hit: null,
      key: `evidence_url:${storagePath}`,
      ttlSeconds: CACHE_TTL,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    // Cache failures should not break the application
    logger.error("[setCachedEvidenceUrl] Error (non-fatal):", error);
  }
}

/**
 * Get multiple cached URLs in batch
 */
export async function getBatchCachedUrls(
  storagePaths: string[]
): Promise<{ found: Record<string, string>; missing: string[] }> {
  const found: Record<string, string> = {};
  const missing: string[] = [];

  await Promise.all(
    storagePaths.map(async (path) => {
      const cached = await getCachedEvidenceUrl(path);
      if (cached) {
        found[path] = cached;
      } else {
        missing.push(path);
      }
    })
  );

  return { found, missing };
}

/**
 * Cache multiple signed URLs in batch
 */
export async function setBatchCachedUrls(
  urlMap: Record<string, string>,
  expiresIn: number = 60 * 60 * 24 * 7
): Promise<void> {
  await Promise.all(
    Object.entries(urlMap).map(([path, url]) => setCachedEvidenceUrl(path, url, expiresIn))
  );
}

/**
 * Invalidate cached URL (e.g., when evidence is deleted)
 */
export async function invalidateEvidenceUrl(storagePath: string): Promise<void> {
  try {
    const redis = getUpstashRedis();
    if (!redis) return;

    await redis.del(`${CACHE_PREFIX}${storagePath}`);

    logCacheOperation({
      operation: "invalidate",
      key: `evidence_url:${storagePath}`,
      duration: 0,
    });
  } catch (error) {
    logger.error("[invalidateEvidenceUrl] Error (non-fatal):", error);
  }
}

/**
 * Get cache statistics for monitoring
 */
export async function getEvidenceUrlCacheStats(): Promise<{
  totalKeys: number;
  keyPattern: string;
}> {
  try {
    const redis = getUpstashRedis();
    if (!redis) {
      return { totalKeys: 0, keyPattern: CACHE_PREFIX };
    }

    // Note: SCAN is expensive on large datasets
    // This is just for monitoring, not for production use in hot paths
    const keys = await redis.keys(`${CACHE_PREFIX}*`);

    return {
      totalKeys: keys.length,
      keyPattern: CACHE_PREFIX,
    };
  } catch (error) {
    logger.error("[getEvidenceUrlCacheStats] Error:", error);
    return { totalKeys: 0, keyPattern: CACHE_PREFIX };
  }
}
