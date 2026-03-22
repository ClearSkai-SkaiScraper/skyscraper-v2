/**
 * Canonical Claim Resolver
 *
 * Ensures all claim lookups work with either:
 * - Database ID (UUID/CUID)
 * - Claim Number (CL-...)
 *
 * Returns canonical ID for URL normalization.
 */

import { getResolvedOrgIdSafe } from "@/lib/auth/getResolvedOrgId";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type ResolveClaimResult =
  | { ok: true; claim: any; canonicalId: string; inputId: string; foundBy: "id" | "claimNumber" }
  | { ok: false; reason: "NOT_FOUND" | "NO_ORG"; inputId: string; orgId?: string };

/**
 * Resolve claim by id OR claimNumber and return canonical data
 *
 * @param inputId - Either database ID or claimNumber
 * @param providedOrgId - Optional orgId (for API routes), otherwise resolves from auth
 * @returns Result with canonical claim ID for redirect
 */
export async function resolveClaim(
  inputId: string,
  providedOrgId?: string
): Promise<ResolveClaimResult> {
  try {
    // Get org ID
    const orgId = providedOrgId ?? (await getResolvedOrgIdSafe());
    if (!orgId) {
      return { ok: false, reason: "NO_ORG", inputId };
    }

    logger.debug(`[resolveClaim] Looking up claim: ${inputId} for orgId: ${orgId}`);

    // Query by id OR claimNumber
    const claim = await prisma.claims.findFirst({
      where: {
        orgId,
        OR: [{ id: inputId }, { claimNumber: inputId }],
      },
    });

    if (!claim) {
      logger.error(`[resolveClaim] NOT_FOUND: ${inputId} for orgId: ${orgId}`);
      return { ok: false, reason: "NOT_FOUND", inputId, orgId };
    }

    // Determine which field matched
    const foundBy = claim.id === inputId ? ("id" as const) : ("claimNumber" as const);

    logger.info(
      `[resolveClaim] SUCCESS - Found claim #${claim.claimNumber} by ${foundBy} (canonical: ${claim.id})`
    );

    return {
      ok: true,
      claim,
      canonicalId: claim.id,
      inputId,
      foundBy,
    };
  } catch (error: any) {
    logger.error("[resolveClaim] Error:", error);
    return {
      ok: false,
      reason: "NOT_FOUND",
      inputId,
    };
  }
}

/**
 * Resolve claim and throw if not found (for pages that don't handle errors)
 */
export async function resolveClaimOrThrow(inputId: string, providedOrgId?: string) {
  const result = await resolveClaim(inputId, providedOrgId);

  if (!result.ok) {
    throw new Error(`Claim not found: ${inputId} (${result.reason})`);
  }

  return result;
}
