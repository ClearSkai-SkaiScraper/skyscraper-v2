/**
 * Evidence Storage Helper
 * Handles photo/video/document uploads to Supabase Storage
 * with org-scoped paths and signed URL generation
 */

import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface EvidenceUploadOptions {
  orgId: string;
  claimId: string;
  file: File;
  originalName: string;
}

export interface EvidenceUploadResult {
  assetId: string;
  storagePath: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
}

/**
 * Generate secure filename: {assetId}-{sanitizedOriginalName}
 */
function makeSafeEvidenceFileName(assetId: string, originalName: string): string {
  const ext = originalName.split(".").pop() || "jpg";
  const baseName = originalName
    .replace(/\.[^/.]+$/, "") // Remove extension
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-") // Replace special chars
    .slice(0, 50); // Limit length

  return `${assetId}-${baseName}.${ext}`;
}

/**
 * Get storage path: evidence/{orgId}/{claimId}/{yyyy-mm}/{fileName}
 */
function getEvidenceStoragePath(orgId: string, claimId: string, fileName: string): string {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `evidence/${orgId}/${claimId}/${yearMonth}/${fileName}`;
}

/**
 * Upload evidence file to Supabase Storage
 */
export async function uploadEvidence(
  options: EvidenceUploadOptions
): Promise<EvidenceUploadResult> {
  const { orgId, claimId, file, originalName } = options;

  // Verify authentication
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Authentication required to upload evidence");
  }

  // Generate unique asset ID
  const assetId = crypto.randomUUID();

  // Create safe filename
  const fileName = makeSafeEvidenceFileName(assetId, originalName);

  // Build storage path
  const storagePath = getEvidenceStoragePath(orgId, claimId, fileName);

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage.from("evidence").upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false, // Safety: don't overwrite existing files
  });

  if (error) {
    logger.error("Evidence upload error:", error);
    throw new Error(`Failed to upload evidence: ${error.message}`);
  }

  return {
    assetId,
    storagePath: data.path,
    fileName,
    sizeBytes: file.size,
    mimeType: file.type,
  };
}

/**
 * Generate signed URL for secure time-limited access
 * Now with caching layer to reduce Supabase API calls
 *
 * @param storagePath Full path in storage bucket
 * @param expiresIn TTL in seconds (default 7 days)
 * @param skipCache Skip cache and force fresh URL generation
 */
export async function getEvidenceSignedUrl(
  storagePath: string,
  expiresIn: number = 60 * 60 * 24 * 7, // 7 days
  skipCache: boolean = false
): Promise<string> {
  // Try cache first (if not skipped)
  if (!skipCache) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { getCachedEvidenceUrl, setCachedEvidenceUrl } = await import("./evidenceUrlCache");
    const cached = await getCachedEvidenceUrl(storagePath);
    if (cached) {
      return cached;
    }
  }

  // Generate fresh signed URL from Supabase
  const { data, error } = await supabase.storage
    .from("evidence")
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data) {
    throw new Error(`Failed to generate signed URL: ${error?.message || "Unknown error"}`);
  }

  const signedUrl = data.signedUrl;

  // Cache the result (fire-and-forget)
  if (!skipCache) {
    const { setCachedEvidenceUrl } = await import("./evidenceUrlCache");
    setCachedEvidenceUrl(storagePath, signedUrl, expiresIn).catch((err) =>
      logger.error("[EVIDENCE_CACHE] Cache set failed (non-fatal)", { error: err })
    );
  }

  return signedUrl;
}

/**
 * Delete evidence file from storage
 */
export async function deleteEvidence(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from("evidence").remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete evidence: ${error.message}`);
  }
}

/**
 * Generate multiple signed URLs in batch (optimized with cache)
 * Useful for rendering evidence grids or PDF embedding
 *
 * Performance optimization:
 * - Checks cache first to avoid unnecessary Supabase API calls
 * - Only generates fresh URLs for cache misses
 * - Uses parallel Promise.all for concurrent requests
 * - Fails gracefully (returns empty string for failed URLs)
 *
 * @param storagePaths Array of storage paths to generate URLs for
 * @param expiresIn TTL in seconds (default 7 days)
 * @param skipCache Skip cache and force fresh URL generation
 * @returns Map of path → signed URL
 */
export async function getBatchSignedUrls(
  storagePaths: string[],
  expiresIn: number = 60 * 60 * 24 * 7,
  skipCache: boolean = false
): Promise<Record<string, string>> {
  // Early return for empty array
  if (storagePaths.length === 0) {
    return {};
  }

  logger.debug(`[EVIDENCE_BATCH_URLS] Generating ${storagePaths.length} signed URLs`, {
    skipCache,
  });
  const startTime = Date.now();

  const results: Record<string, string> = {};

  // Check cache first if not skipped
  let pathsToGenerate = storagePaths;
  if (!skipCache) {
    const { getBatchCachedUrls } = await import("./evidenceUrlCache");
    const { found, missing } = await getBatchCachedUrls(storagePaths);

    // Add cached URLs to results
    Object.assign(results, found);
    pathsToGenerate = missing;

    logger.debug(
      `[EVIDENCE_BATCH_URLS] Cache: ${Object.keys(found).length} hits, ${missing.length} misses`
    );
  }

  // Generate fresh URLs for cache misses (or all if cache skipped)
  if (pathsToGenerate.length > 0) {
    const freshUrls = await Promise.all(
      pathsToGenerate.map(async (path) => {
        try {
          const url = await getEvidenceSignedUrl(path, expiresIn, skipCache);
          return { path, url };
        } catch (error) {
          logger.error(`Failed to generate signed URL for ${path}:`, error);
          return { path, url: "" }; // Empty string for failed paths
        }
      })
    );

    // Add fresh URLs to results
    freshUrls.forEach(({ path, url }) => {
      results[path] = url;
    });
  }

  const duration = Date.now() - startTime;
  const cacheHitRate = skipCache
    ? 0
    : ((storagePaths.length - pathsToGenerate.length) / storagePaths.length) * 100;
  logger.info(
    `[EVIDENCE_BATCH_URLS] Generated ${Object.keys(results).length} URLs in ${duration}ms (${Math.round(duration / storagePaths.length)}ms avg, ${Math.round(cacheHitRate)}% cache hit rate)`
  );

  return results;
}

/**
 * Pre-fetch signed URLs for evidence collection
 * Returns array with URLs in same order as input paths
 * Useful when you need to maintain order (e.g., photo carousel)
 */
export async function prefetchEvidenceUrls(
  storagePaths: string[],
  expiresIn: number = 60 * 60 * 24 * 7
): Promise<string[]> {
  const urlMap = await getBatchSignedUrls(storagePaths, expiresIn);
  return storagePaths.map((path) => urlMap[path] || "");
}

/**
 * Check if evidence bucket exists and is accessible
 */
export async function isEvidenceBucketReady(): Promise<boolean> {
  try {
    const { data } = await supabase.storage.getBucket("evidence");
    return !!data;
  } catch {
    return false;
  }
}
