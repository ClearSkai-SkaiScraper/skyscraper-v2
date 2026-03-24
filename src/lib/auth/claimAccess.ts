/**
 * ============================================================================
 * CLAIM-SCOPED ACCESS CONTROL
 * ============================================================================
 *
 * Extracted from the deprecated System C (`@/lib/auth/permissions`).
 *
 * These helpers verify whether a user can act on a *specific claim*.
 * They are **not** role-based RBAC checks — they verify org-ownership
 * and/or client-portal access on individual claim records.
 *
 * For role-based access control use `@/lib/auth/rbac` (System B).
 *
 * @module claimAccess
 */

import { getTenant } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve claim orgId and current tenant in parallel.
 * Returns `null` if the claim doesn't exist.
 */
async function resolveClaimContext(claimId: string) {
  const [claim, tenant] = await Promise.all([
    prisma.claims.findUnique({
      where: { id: claimId },
      select: { orgId: true },
    }),
    getTenant(),
  ]);

  if (!claim) return null;

  return { claimOrgId: claim.orgId, tenantOrgId: tenant, isOrgOwner: tenant === claim.orgId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if user can upload files to a claim.
 * Requires: Org ownership OR portal access.
 */
export async function canUpload({
  userId,
  claimId,
}: {
  userId: string;
  claimId: string;
}): Promise<boolean> {
  try {
    const ctx = await resolveClaimContext(claimId);
    if (!ctx) return false;
    if (ctx.isOrgOwner) return true;

    // Check portal access
    const portalAccess = await prisma.client_access.findFirst({
      where: { claimId, email: userId },
    });

    return !!portalAccess;
  } catch (error) {
    logger.error("[claimAccess] canUpload error:", error);
    return false;
  }
}

/**
 * Check if user can edit claim details.
 * Requires: Org ownership with appropriate role.
 */
export async function canEditClaim({
  userId,
  claimId,
}: {
  userId: string;
  claimId: string;
}): Promise<boolean> {
  try {
    const ctx = await resolveClaimContext(claimId);
    return ctx?.isOrgOwner ?? false;
  } catch (error) {
    logger.error("[claimAccess] canEditClaim error:", error);
    return false;
  }
}

/**
 * Check if user can invite clients to a claim portal.
 * Requires: Org ownership.
 */
export async function canInviteClients({
  userId,
  claimId,
}: {
  userId: string;
  claimId: string;
}): Promise<boolean> {
  try {
    const ctx = await resolveClaimContext(claimId);
    return ctx?.isOrgOwner ?? false;
  } catch (error) {
    logger.error("[claimAccess] canInviteClients error:", error);
    return false;
  }
}

/**
 * Check if user can attach vendors to a claim.
 * Requires: Org ownership.
 */
export async function canAttachVendors({
  userId,
  claimId,
}: {
  userId: string;
  claimId: string;
}): Promise<boolean> {
  try {
    const ctx = await resolveClaimContext(claimId);
    return ctx?.isOrgOwner ?? false;
  } catch (error) {
    logger.error("[claimAccess] canAttachVendors error:", error);
    return false;
  }
}

/**
 * Get all permissions for a user on a specific claim.
 * Useful for UI to show/hide multiple actions at once.
 */
export async function getClaimPermissions({
  userId,
  claimId,
}: {
  userId: string;
  claimId: string;
}): Promise<{
  canView: boolean;
  canEdit: boolean;
  canUpload: boolean;
  canInvite: boolean;
  canAttachVendors: boolean;
  isOrgOwner: boolean;
  portalRole?: "VIEWER" | "EDITOR";
}> {
  const noAccess = {
    canView: false,
    canEdit: false,
    canUpload: false,
    canInvite: false,
    canAttachVendors: false,
    isOrgOwner: false,
  };

  try {
    const ctx = await resolveClaimContext(claimId);
    if (!ctx) return noAccess;

    // Check portal access
    const portalAccess = await prisma.client_access.findFirst({
      where: { claimId, email: userId },
    });

    const hasPortalAccess = !!portalAccess;

    return {
      canView: ctx.isOrgOwner || hasPortalAccess,
      canEdit: ctx.isOrgOwner,
      canUpload: ctx.isOrgOwner || hasPortalAccess,
      canInvite: ctx.isOrgOwner,
      canAttachVendors: ctx.isOrgOwner,
      isOrgOwner: ctx.isOrgOwner,
      portalRole: hasPortalAccess ? "EDITOR" : undefined,
    };
  } catch (error) {
    logger.error("[claimAccess] getClaimPermissions error:", error);
    return noAccess;
  }
}
