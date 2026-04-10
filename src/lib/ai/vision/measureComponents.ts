import { upstash } from '@/lib/upstash';

/**
 * measureComponents
 * ----------------------------------------------
 * Estimates counts & measurements for roof components:
 * - Squares, ridge length, hip length, valley length
 * - Eave / rake linear feet
 * - Vent / pipe jack counts
 * - Skylight dimensions (approx)
 */
export async function measureComponents(options: {
  orgId: string;
  claimId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geometry: any; // output from extractRoofGeometry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  materials: any; // output from classifyMaterials
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Promise<{ components: any; meta: { cached?: boolean } }> {
  const redis = upstash;
  const jobKey = `aiq:measure:${options.claimId}`;
  if (redis) {
    try {
      const cached = await redis.get(jobKey);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (cached) return { ...(cached as any), meta: { cached: true } };
    } catch {}
  }

  // TODO: Derive measurements from geometry + heuristics
  const components = {
    squares: null,
    ridgeLF: null,
    hipLF: null,
    valleyLF: null,
    eaveLF: null,
    rakeLF: null,
    vents: [],
    skylights: [],
  };

  if (redis) { try { await redis.setex(jobKey, 3600, JSON.stringify({ components })); } catch {} }
  return { components, meta: {} };
}
