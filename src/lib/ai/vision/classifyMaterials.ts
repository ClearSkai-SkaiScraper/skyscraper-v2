import { upstash } from '@/lib/upstash';

import { getStorageUrlForAsset } from '../../storage/getStorageUrl';

/**
 * classifyMaterials
 * ----------------------------------------------
 * Identifies roofing / exterior materials:
 * - Shingle type (architectural, 3-tab, metal, tile, etc.)
 * - Underlayment indicators
 * - Accessory components (vents, skylights, flashing types)
 * - Siding / gutter / fascia materials (future expansion)
 */
export async function classifyMaterials(options: {
  orgId: string;
  claimId: string;
  photoIds: string[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Promise<{ materials: any; meta: { cached?: boolean } }> {
  const redis = upstash;
  const jobKey = `aiq:materials:${options.claimId}`;
  if (redis) {
    try {
      const cached = await redis.get(jobKey);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (cached) return { ...(cached as any), meta: { cached: true } };
    } catch {}
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const photoUrls = await Promise.all(options.photoIds.map(id => getStorageUrlForAsset(id)));

  // TODO: Vision classification prompt to GPT-4o using photoUrls
  const materials = { primary: 'unknown', accessories: [], confidence: 0.0 };

  if (redis) { try { await redis.setex(jobKey, 3600, JSON.stringify({ materials })); } catch {} }
  return { materials, meta: {} };
}
