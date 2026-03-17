/**
 * UNIFIED ORG RESOLVER - WRAPS getActiveOrgSafe
 * ==============================================
 *
 * This is a thin wrapper around the battle-tested getActiveOrgSafe.
 * It adds mode-based redirects for page-level use.
 *
 * MODES:
 * - "required" → redirects to /sign-in if unauthenticated, /onboarding if no org
 * - "optional" → returns { ok: false } if no org (for pages that can render without)
 * - "demo-ok"  → allows demo routes without org, otherwise like "optional"
 *
 * IMPORTANT: This does NOT duplicate self-healing logic.
 * getActiveOrgSafe({ allowAutoCreate: true }) handles all org creation safely.
 */

import { redirect } from "next/navigation";

import { getActiveOrgSafe } from "@/lib/auth/getActiveOrgSafe";
import { logger } from "@/lib/logger";

// =============================================================================
// TYPES
// =============================================================================

export type OrgMode = "required" | "optional" | "demo-ok";

export type OrgResult =
  | {
      ok: true;
      userId: string;
      orgId: string;
      orgName: string;
      clerkOrgId: string | null;
      role: string;
    }
  | {
      ok: false;
      reason: "unauthenticated" | "no_org" | "error";
      error?: string;
    };

export interface GetOrgOptions {
  mode?: OrgMode;
  /** For demo-ok mode: the claimId to check if it's a demo route */
  claimId?: string;
}

// =============================================================================
// PUBLIC: getOrg() with mode-based behavior
// =============================================================================

/**
 * Get organization context with mode-based handling.
 *
 * @param options.mode - "required" | "optional" | "demo-ok"
 * @param options.claimId - For demo-ok mode, the claimId to check
 *
 * MODES:
 * - "required": Uses getActiveOrgSafe which auto-creates if needed, redirects if still no org
 * - "optional": Returns { ok: false, reason: "no_org" } if no org
 * - "demo-ok": Like optional, but caller knows to allow demo rendering
 */
export async function getOrg(options: GetOrgOptions = {}): Promise<OrgResult> {
  const { mode = "optional" } = options;

  // Delegate to battle-tested getActiveOrgSafe
  // allowAutoCreate=true for "required" mode, false for optional/demo-ok
  const allowAutoCreate = mode === "required";
  const result = await getActiveOrgSafe({ allowAutoCreate });

  // Convert result to our format
  if (result.ok) {
    return {
      ok: true,
      userId: result.userId,
      orgId: result.org.id,
      orgName: result.org.name ?? "My Organization",
      clerkOrgId: result.org.clerkOrgId,
      role: "ADMIN", // getActiveOrgSafe doesn't track role, default to ADMIN
    };
  }

  // Handle failures based on mode
  const reason = result.reason === "NO_SESSION" ? "unauthenticated" : "no_org";

  if (mode === "required") {
    if (reason === "unauthenticated") {
      logger.debug("[getOrg] Required mode: redirecting to /sign-in");
      redirect("/sign-in");
    }
    // no_org after auto-create failed - redirect to onboarding
    logger.debug("[getOrg] Required mode: no org after auto-create, redirecting to /onboarding");
    redirect("/onboarding");
  }

  // For "optional" and "demo-ok", return the result as-is
  return {
    ok: false,
    reason,
    error: result.error,
  };
}

// =============================================================================
// CONVENIENCE HELPERS
// =============================================================================

/**
 * Get org ID only - returns null if no org
 */
export async function getOrgId(): Promise<string | null> {
  const result = await getOrg({ mode: "optional" });
  return result.ok ? result.orgId : null;
}

/**
 * Require org and return it - redirects if missing
 */
export async function requireOrg(): Promise<{
  userId: string;
  orgId: string;
  orgName: string;
  clerkOrgId: string | null;
  role: string;
}> {
  const result = await getOrg({ mode: "required" });
  // If we get here, result is guaranteed ok (otherwise would have redirected)
  if (!result.ok) {
    // This should never happen, but TypeScript needs it
    throw new Error("Unexpected: requireOrg failed without redirect");
  }
  return result;
}

/**
 * Check if current request is for a demo route
 */
export function isDemoRoute(claimId?: string): boolean {
  return claimId === "test" || claimId?.startsWith("demo-") || false;
}

// =============================================================================
// BACKWARDS COMPATIBILITY EXPORTS (for migration)
// =============================================================================

/** @deprecated Use getOrg({ mode: "optional" }) instead */
export const safeOrgContext = () => getOrg({ mode: "optional" });

/** @deprecated Use getOrg({ mode: "optional" }) instead */
export const getActiveOrgContext = (opts?: { required?: boolean; optional?: boolean }) => {
  // Map old API to new API
  if (opts?.required) return getOrg({ mode: "required" });
  return getOrg({ mode: "optional" });
};

/** @deprecated Use getOrg({ mode: "optional" }) instead */
export const getOrgContext = () => getOrg({ mode: "optional" });
