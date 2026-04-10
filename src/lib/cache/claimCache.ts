import { upstash } from '@/lib/upstash';

/**
 * claimCache.ts
 * ----------------------------------------------
 * Specialized cache helpers for:
 * - Asset lists per claim
 * - Active analysis job statuses
 * - Weather lookups
 * - Claim state snapshots (for quick UI hydration)
 */
const redis = upstash; // may be null

const TTL_1H = 3600;
const TTL_5M = 300;

function key(parts: (string | number | undefined)[]) {
  return parts.filter(Boolean).join(':');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheClaimAssets(claimId: string, assets: any[]) {
  if (!redis) return;
  try { await redis.setex(key(['claim-assets', claimId]), TTL_5M, JSON.stringify(assets)); } catch {}
}
export async function getCachedClaimAssets(claimId: string) {
  if (!redis) return null;
  try {
    const data = await redis.get(key(['claim-assets', claimId]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data ? (data as any) : null;
  } catch { return null; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheAnalysisJob(claimId: string, type: string, status: string, payload?: any) {
  if (!redis) return;
  const record = { status, payload, ts: Date.now() };
  try { await redis.setex(key(['claim-analysis-job', claimId, type]), TTL_1H, JSON.stringify(record)); } catch {}
}
export async function getAnalysisJob(claimId: string, type: string) {
  if (!redis) return null;
  try {
    const data = await redis.get(key(['claim-analysis-job', claimId, type]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data ? (data as any) : null;
  } catch { return null; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheWeatherLookup(addressHash: string, data: any) {
  if (!redis) return;
  try { await redis.setex(key(['weather', addressHash]), TTL_1H, JSON.stringify(data)); } catch {}
}
export async function getCachedWeather(addressHash: string) {
  if (!redis) return null;
  try {
    const data = await redis.get(key(['weather', addressHash]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data ? (data as any) : null;
  } catch { return null; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheClaimSnapshot(claimId: string, snapshot: any) {
  if (!redis) return;
  try { await redis.setex(key(['claim-snapshot', claimId]), TTL_5M, JSON.stringify(snapshot)); } catch {}
}
export async function getClaimSnapshot(claimId: string) {
  if (!redis) return null;
  try {
    const data = await redis.get(key(['claim-snapshot', claimId]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data ? (data as any) : null;
  } catch { return null; }
}
