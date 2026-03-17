/**
 * Safe org context patterns - never throw, always return actionable results
 * Use these instead of raw getActiveOrgContext() in route handlers
 */

import { isRedirectError } from "next/dist/client/components/redirect";

import { logger } from "@/lib/logger";
import { getActiveOrgContext, type OrgContextResult } from "@/lib/org/getActiveOrgContext";

/**
 * Safe org context for pages - returns typed result, never throws
 * Use this in RSC pages where you need org but want to handle failure gracefully
 */
export async function getOrgContextSafe(): Promise<OrgContextResult> {
  try {
    const result = await getActiveOrgContext({ required: false });
    return result;
  } catch (error) {
    // Let Next.js redirects pass through - they're intentional navigation
    if (isRedirectError(error)) {
      throw error;
    }
    logger.error("[getOrgContextSafe] Unexpected error:", error);
    return {
      ok: false,
      reason: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get org ID or null - simple helper for optional org contexts
 */
export async function getOrgIdSafe(): Promise<string | null> {
  try {
    const result = await getActiveOrgContext({ optional: true });
    return result.ok ? result.orgId : null;
  } catch {
    return null;
  }
}

/**
 * Get org ID with timeout - prevents hanging on slow DB queries
 */
export async function getOrgIdWithTimeout(timeoutMs = 3000): Promise<string | null> {
  try {
    const orgPromise = getActiveOrgContext({ optional: true });
    const timeoutPromise = new Promise<{ ok: false; reason: "error" }>((_, reject) =>
      setTimeout(() => reject(new Error("Org context timeout")), timeoutMs)
    );

    const result = await Promise.race([orgPromise, timeoutPromise]);
    return result.ok ? result.orgId : null;
  } catch {
    return null;
  }
}
