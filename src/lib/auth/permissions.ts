/**
 * @deprecated ⚠️ SYSTEM C — DEPRECATED
 * Use `@/lib/auth/rbac` (System B) instead. This file uses "verb:noun"
 * permission format (view:claims, create:reports) which conflicts with
 * the canonical "noun:verb" format (claims:create, reports:view) in System B.
 *
 * Remaining importers to migrate:
 * - src/app/api/claims/[claimId]/permissions/route.ts
 *
 * @see src/lib/auth/rbac.ts — the canonical System B
 */
import { auth } from "@clerk/nextjs/server";

import { getTenant } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type Role = "viewer" | "member" | "admin";

export type Permission =
  | "view:claims"
  | "create:claims"
  | "edit:claims"
  | "delete:claims"
  | "view:reports"
  | "create:reports"
  | "edit:reports"
  | "delete:reports"
  | "view:team"
  | "invite:members"
  | "remove:members"
  | "manage:roles"
  | "view:vendors"
  | "create:vendors"
  | "edit:vendors"
  | "delete:vendors"
  | "view:settings"
  | "edit:settings"
  | "manage:billing";

// Role hierarchy: admin > member > viewer
const roleHierarchy: Record<Role, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
};

// Permission matrix: what each role can do
const permissions: Record<Role, Permission[]> = {
  viewer: ["view:claims", "view:reports", "view:team", "view:vendors"],
  member: [
    "view:claims",
    "create:claims",
    "edit:claims",
    "view:reports",
    "create:reports",
    "edit:reports",
    "view:team",
    "view:vendors",
    "create:vendors",
    "edit:vendors",
  ],
  admin: [
    "view:claims",
    "create:claims",
    "edit:claims",
    "delete:claims",
    "view:reports",
    "create:reports",
    "edit:reports",
    "delete:reports",
    "view:team",
    "invite:members",
    "remove:members",
    "manage:roles",
    "view:vendors",
    "create:vendors",
    "edit:vendors",
    "delete:vendors",
    "view:settings",
    "edit:settings",
    "manage:billing",
  ],
};

/**
 * Get current user's role in their organization
 */
export async function getUserRole(): Promise<Role | null> {
  try {
    const { userId } = await auth();
    const orgId = await getTenant();

    if (!userId || !orgId) {
      return null;
    }

    const user = await prisma.users.findFirst({
      where: {
        clerkUserId: userId,
        orgId: orgId,
      },
      select: {
        role: true,
      },
    });

    // Map the database role to our permission role
    const roleMap: Record<string, Role> = {
      ADMIN: "admin",
      USER: "member",
      VIEWER: "viewer",
    };

    return user?.role ? roleMap[user.role] || "viewer" : null;
  } catch (error) {
    logger.error("Failed to get user role:", error);
    return null;
  }
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
  const role = await getUserRole();
  if (!role) return false;

  return permissions[role].includes(permission);
}

/**
 * Check if user has ALL of the specified permissions
 */
export async function hasAllPermissions(requiredPermissions: Permission[]): Promise<boolean> {
  const role = await getUserRole();
  if (!role) return false;

  const userPermissions = permissions[role];
  return requiredPermissions.every((p) => userPermissions.includes(p));
}

/**
 * Check if user has ANY of the specified permissions
 */
export async function hasAnyPermission(requiredPermissions: Permission[]): Promise<boolean> {
  const role = await getUserRole();
  if (!role) return false;

  const userPermissions = permissions[role];
  return requiredPermissions.some((p) => userPermissions.includes(p));
}

/**
 * Check if user has a minimum role level
 */
export async function hasMinRole(minRole: Role): Promise<boolean> {
  const role = await getUserRole();
  if (!role) return false;

  return roleHierarchy[role] >= roleHierarchy[minRole];
}

/**
 * Require specific permission - throws 403 error if not authorized
 */
export async function requirePermission(permission: Permission): Promise<void> {
  const authorized = await hasPermission(permission);
  if (!authorized) {
    throw new Error(`Missing required permission: ${permission}`);
  }
}

/**
 * Require minimum role - throws 403 error if not authorized
 */
export async function requireRole(minRole: Role): Promise<void> {
  const authorized = await hasMinRole(minRole);
  if (!authorized) {
    throw new Error(`Insufficient role: requires ${minRole} or higher`);
  }
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return permissions[role];
}

/**
 * Check if one role is higher than another
 */
export function isRoleHigher(role1: Role, role2: Role): boolean {
  return roleHierarchy[role1] > roleHierarchy[role2];
}

/**
 * Get user's permissions (utility for UI)
 */
export async function getUserPermissions(): Promise<Permission[]> {
  const role = await getUserRole();
  if (!role) return [];

  return permissions[role];
}

// Legacy function for backwards compatibility
export async function ensureRole(userId: string, allowedRoles: string[]) {
  logger.warn("ensureRole is deprecated - use requireRole or requirePermission instead");
  const role = await getUserRole();
  if (!role) {
    throw new Error(
      `Forbidden: User does not have required role. Required: ${allowedRoles.join(" or ")}`
    );
  }

  const hasAccess = allowedRoles.includes(role);
  if (!hasAccess) {
    throw new Error(
      `Forbidden: User does not have required role. Required: ${allowedRoles.join(" or ")}`
    );
  }

  return true;
}

// Legacy function for backwards compatibility
export async function getUserRoles(userId: string): Promise<string[]> {
  logger.warn("getUserRoles is deprecated - use getUserRole instead");
  const role = await getUserRole();
  return role ? [role] : [];
}

// ============================================================================
// PHASE C - CLAIM-SPECIFIC PERMISSIONS
// ============================================================================

/**
 * Check if user can upload files to a claim
 * Requires: Claim ownership OR portal access with EDITOR role
 */
export async function canUpload({
  userId,
  claimId,
}: {
  userId: string;
  claimId: string;
}): Promise<boolean> {
  try {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: { orgId: true },
    });

    if (!claim) return false;

    // Check org ownership
    const tenant = await getTenant();
    if (tenant === claim.orgId) {
      return true;
    }

    // Check portal access with EDITOR role
    const portalAccess = await prisma.client_access.findFirst({
      where: {
        claimId: claimId,
        email: userId, // Using email as userId lookup
      },
    });

    return !!portalAccess;
  } catch (error) {
    logger.error("Error checking upload permission:", error);
    return false;
  }
}

/**
 * Check if user can edit claim details
 * Requires: Org ownership with appropriate role
 */
export async function canEditClaim({
  userId,
  claimId,
}: {
  userId: string;
  claimId: string;
}): Promise<boolean> {
  try {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: { orgId: true },
    });

    if (!claim) return false;

    const tenant = await getTenant();
    return tenant === claim.orgId;
  } catch (error) {
    logger.error("Error checking edit claim permission:", error);
    return false;
  }
}

/**
 * Check if user can invite clients to claim
 * Requires: Org ownership
 */
export async function canInviteClients({
  userId,
  claimId,
}: {
  userId: string;
  claimId: string;
}): Promise<boolean> {
  try {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: { orgId: true },
    });

    if (!claim) return false;

    const tenant = await getTenant();
    return tenant === claim.orgId;
  } catch (error) {
    logger.error("Error checking invite clients permission:", error);
    return false;
  }
}

/**
 * Check if user can attach vendors to claim
 * Requires: Org ownership
 */
export async function canAttachVendors({
  userId,
  claimId,
}: {
  userId: string;
  claimId: string;
}): Promise<boolean> {
  try {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: { orgId: true },
    });

    if (!claim) return false;

    const tenant = await getTenant();
    return tenant === claim.orgId;
  } catch (error) {
    logger.error("Error checking attach vendors permission:", error);
    return false;
  }
}

/**
 * Get all permissions for a user on a claim
 * Useful for UI to show/hide multiple actions at once
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
  try {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: { orgId: true },
    });

    if (!claim) {
      return {
        canView: false,
        canEdit: false,
        canUpload: false,
        canInvite: false,
        canAttachVendors: false,
        isOrgOwner: false,
      };
    }

    const tenant = await getTenant();
    const isOrgOwner = tenant === claim.orgId;

    // Check portal access
    const portalAccess = await prisma.client_access.findFirst({
      where: {
        claimId,
        email: userId,
      },
    });

    const hasPortalAccess = !!portalAccess;

    return {
      canView: isOrgOwner || hasPortalAccess,
      canEdit: isOrgOwner,
      canUpload: isOrgOwner || hasPortalAccess,
      canInvite: isOrgOwner,
      canAttachVendors: isOrgOwner,
      isOrgOwner,
      portalRole: hasPortalAccess ? "EDITOR" : undefined,
    };
  } catch (error) {
    logger.error("Error getting claim permissions:", error);
    return {
      canView: false,
      canEdit: false,
      canUpload: false,
      canInvite: false,
      canAttachVendors: false,
      isOrgOwner: false,
    };
  }
}
