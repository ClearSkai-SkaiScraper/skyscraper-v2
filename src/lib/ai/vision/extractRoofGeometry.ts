import { upstash } from '@/lib/upstash';

import { getStorageUrlForAsset } from '../../storage/getStorageUrl';

/**
 * extractRoofGeometry
 * ----------------------------------------------
 * Uses Vision (GPT-4o) + optional segmentation mask(s) (Replicate) to infer:
 * - Slopes (pitch + orientation)
 * - Ridge / hip / valley lines
 * - Eave / rake edges
 * - Approx surface area / complexity score
 *
 * Returns partial ClaimAnalysis JSON segment: { slopes, roofMap }
 * Interrupt-safe: stores job progress in Redis so it can be resumed.
 */
export async function extractRoofGeometry(options: {
  orgId: string;
  claimId: string;
  photoIds: string[]; // prioritized top-down / drone photos first
  useSegmentation?: boolean;
}): Promise<{ slopes: any; roofMap: any; meta: { cached?: boolean } }> {
  const redis = upstash;
  const jobKey = `aiq:roof-geometry:${options.claimId}`;

  // If Redis unavailable, skip cache entirely
  if (redis) {
    try {
      const cached = await redis.get(jobKey);
      if (cached) return { ...(cached as any), meta: { cached: true } };
    } catch {}
  }

  // 1. Resolve photo URLs
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const photoUrls = await Promise.all(options.photoIds.map(id => getStorageUrlForAsset(id)));

  // 2. (Placeholder) Call segmentation model if requested
  let segmentation: any = null;
  if (options.useSegmentation) {
    // TODO: integrate Replicate model call and produce mask polygons
    segmentation = { masks: [], version: 'pending' };
  }

  // 3. (Placeholder) Vision prompt to GPT-4o
  // TODO: Implement actual OpenAI Vision call here with structured JSON response
  const slopes = { segments: [], version: 'draft' };
  const roofMap = { edges: [], ridges: [], hips: [], valleys: [], masks: segmentation?.masks || [] };

  const result = { slopes, roofMap };
  if (redis) {
    try { await redis.setex(jobKey, 3600, JSON.stringify(result)); } catch {}
  }

  return { ...result, meta: {} };
}
