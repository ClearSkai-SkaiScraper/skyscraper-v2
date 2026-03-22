import crypto from "crypto";
import { z } from "zod";

import { delFlagCache, getFlagCache, logCacheEvent, setFlagCache } from "@/lib/flagCache";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ============================================================================
// DEMO MODE FLAGS (Tuesday Demo - Feature Flag Based)
// ============================================================================

/**
 * Check if Demo Mode is enabled
 *
 * When enabled, shows polished demo UIs for Trades Network, Vendor Directory,
 * Client Portal, Messages, and Job Requests using mock data.
 *
 * When disabled, shows "Coming Soon" pages or hides demo routes entirely.
 *
 * Enable in Vercel: NEXT_PUBLIC_DEMO_MODE=true
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

/**
 * Demo mode configuration
 */
export const DEMO_CONFIG = {
  enabled: isDemoMode(),
  features: {
    tradesNetwork: isDemoMode(),
    vendorDirectory: isDemoMode(),
    clientPortal: isDemoMode(),
    messages: isDemoMode(),
    jobRequests: isDemoMode(),
  },
} as const;

// ============================================================================
// PRODUCTION FEATURE FLAGS (Database-driven)
// ============================================================================

// In-memory legacy meta cache to retain rolloutPercent/targeting when migrations not applied.
const legacyFlagMeta: Map<string, { rolloutPercent: number; targeting: any }> =
  (globalThis as any).__legacyFlagMeta || new Map();
(globalThis as any).__legacyFlagMeta = legacyFlagMeta;

export const targetingSchema = z
  .object({
    userIds: z.array(z.string()).optional(),
    orgIds: z.array(z.string()).optional(),
  })
  .strict();
// Async usage increment (fire-and-forget)
async function incrementUsage(key: string, orgId?: string | null) {
  try {
    await prisma.$executeRaw`INSERT INTO app.feature_flag_usage (key, org_id, date, hits) VALUES (${key}, ${orgId || null}, CURRENT_DATE, 1) ON CONFLICT (key, org_id, date) DO UPDATE SET hits = app.feature_flag_usage.hits + 1`;
  } catch (e) {
    logger.warn("[flags] usage increment failed:", e);
  }
}

// Returns org-specific override if present, else global (NULL org_id) record
function cohortPercentage(key: string, userId: string): number {
  const hash = crypto
    .createHash("sha256")
    .update(key + ":" + userId)
    .digest("hex")
    .slice(0, 8);
  const num = parseInt(hash, 16);
  return num % 100; // 0..99
}

function shouldTargetUser(targeting: any, userId: string, orgId?: string | null): boolean {
  if (!targeting) return true;
  try {
    const t = targetingSchema.safeParse(targeting);
    if (!t.success) return true;
    const val = t.data;
    if (val.userIds && Array.isArray(val.userIds)) return val.userIds.includes(userId);
    if (val.orgIds && Array.isArray(val.orgIds) && orgId) return val.orgIds.includes(orgId);
  } catch (e) {
    logger.warn("[flags] targeting parse failed:", e);
  }
  return true; // default allow if malformed
}

export async function evaluateFlag(
  key: string,
  orgId?: string | null,
  userId?: string | null
): Promise<boolean> {
  const cacheKey = `${orgId || "global"}:${key}`;
  let rows: any[] = [];
  try {
    rows =
      await prisma.$queryRaw`SELECT id, enabled, rollout_percent, targeting FROM app.feature_flags WHERE key = ${key} AND (org_id = ${orgId || null} OR org_id IS NULL) ORDER BY CASE WHEN org_id = ${orgId || null} THEN 0 ELSE 1 END LIMIT 1`;
  } catch (err) {
    // Fallback for environments where rollout_percent/targeting columns not yet migrated.
    try {
      rows =
        await prisma.$queryRaw`SELECT id, enabled FROM app.feature_flags WHERE key = ${key} AND (org_id = ${orgId || null} OR org_id IS NULL) ORDER BY CASE WHEN org_id = ${orgId || null} THEN 0 ELSE 1 END LIMIT 1`;
    } catch (e2) {
      logger.warn("[flags] flag query fallback also failed:", e2);
    }
  }
  const row = rows[0];
  // Provide defaults when columns are absent.
  const rolloutPercent =
    row?.rollout_percent === undefined || row?.rollout_percent === null
      ? (legacyFlagMeta.get(`${orgId || "global"}:${key}`)?.rolloutPercent ?? 100)
      : row.rollout_percent;
  let enabled = !!row?.enabled;
  const partial = row && (rolloutPercent < 100 || row.targeting != null);
  if (!partial) {
    const cached = await getFlagCache(cacheKey);
    if (cached !== null) {
      logCacheEvent("hit", cacheKey);
      incrementUsage(key, orgId || null);
      return cached === "1";
    }
    logCacheEvent("miss", cacheKey);
  }
  if (enabled && row) {
    if (rolloutPercent < 100 && userId) {
      const pct = cohortPercentage(key, userId);
      if (pct >= rolloutPercent) enabled = false;
    }
    if (enabled && row.targeting && userId) {
      if (!shouldTargetUser(row.targeting, userId, orgId || null)) enabled = false;
    }
  }
  incrementUsage(key, orgId || null);
  if (row?.id) {
    prisma.$executeRaw`UPDATE app.feature_flags SET last_access_at = NOW() WHERE id = ${row.id}::uuid`.catch(
      () => {}
    );
  }
  if (!partial) {
    await setFlagCache(cacheKey, enabled ? "1" : "0");
    logCacheEvent("set", cacheKey);
  }
  return enabled;
}

// Backwards compatible alias
export const isFlagEnabled = evaluateFlag;

export async function setFlag(
  key: string,
  enabled: boolean,
  orgId?: string | null,
  rolloutPercent: number = 100,
  targeting?: any
) {
  let validTargeting = null;
  if (targeting !== undefined && targeting !== null) {
    const result = targetingSchema.safeParse(targeting);
    if (!result.success) {
      throw new Error(
        "Invalid targeting schema: must be { userIds?: string[], orgIds?: string[] }"
      );
    }
    // Remove duplicates
    validTargeting = {
      userIds: result.data.userIds ? Array.from(new Set(result.data.userIds)) : undefined,
      orgIds: result.data.orgIds ? Array.from(new Set(result.data.orgIds)) : undefined,
    } as any;
  }
  // Attempt full insert/update with rollout columns; fallback to legacy structure if migration absent.
  try {
    await prisma.$executeRaw`INSERT INTO app.feature_flags (key, enabled, org_id, last_access_at, rollout_percent, targeting) VALUES (${key}, ${enabled}, ${orgId || null}, NOW(), ${rolloutPercent}, ${validTargeting ? JSON.stringify(validTargeting) : null}) ON CONFLICT (key, org_id) DO UPDATE SET enabled = EXCLUDED.enabled, last_access_at = NOW(), rollout_percent = EXCLUDED.rollout_percent, targeting = EXCLUDED.targeting`;
    legacyFlagMeta.delete(`${orgId || "global"}:${key}`);
  } catch (e) {
    logger.warn("[flags] setFlag full insert failed, trying legacy:", e);
    await prisma.$executeRaw`INSERT INTO app.feature_flags (key, enabled, org_id, last_access_at) VALUES (${key}, ${enabled}, ${orgId || null}, NOW()) ON CONFLICT (key, org_id) DO UPDATE SET enabled = EXCLUDED.enabled, last_access_at = NOW()`;
    legacyFlagMeta.set(`${orgId || "global"}:${key}`, {
      rolloutPercent,
      targeting: validTargeting,
    });
  }
  await delFlagCache(`${orgId || "global"}:${key}`);
  logCacheEvent("invalidate", `${orgId || "global"}:${key}`);
  return { key, enabled, orgId: orgId || null, rolloutPercent, targeting: validTargeting };
}

export async function deleteFlag(key: string, orgId?: string | null) {
  await prisma.$executeRaw`DELETE FROM app.feature_flags WHERE key = ${key} AND ((org_id IS NULL AND ${orgId || null}::text IS NULL) OR org_id = ${orgId || null})`;
  await delFlagCache(`${orgId || "global"}:${key}`);
  logCacheEvent("invalidate", `${orgId || "global"}:${key}`);
  return { key, deleted: true };
}
