import { upstash } from '@/lib/upstash';

/**
 * generateScope
 * ----------------------------------------------
 * Combines measurements, materials, and damage signals into a draft scope:
 * - Line items per trade (roofing first)
 * - Suggested quantities (squares, LF, counts)
 * - Code upgrade suggestions (ridge vent, drip edge, ice & water)
 * - Risk-based recommendations (deck replacement, ventilation)
 */
export async function generateScope(options: {
  orgId: string;
  claimId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  damages: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  materials: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  codeFlags?: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Promise<{ scope: any; meta: { cached?: boolean } }> {
  const redis = upstash;
  const jobKey = `aiq:scope:${options.claimId}`;
  if (redis) {
    try {
      const cached = await redis.get(jobKey);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (cached) return { ...(cached as any), meta: { cached: true } };
    } catch {}
  }

  // TODO: Assemble line items with estimation heuristics + AI refinement
  const scope = {
    trades: [
      {
        trade: 'roofing',
        items: [], // {code, description, qty, unit, notes}
      },
    ],
    assumptions: [],
    disclaimers: [],
  };

  if (redis) { try { await redis.setex(jobKey, 3600, JSON.stringify({ scope })); } catch {} }
  return { scope, meta: {} };
}
