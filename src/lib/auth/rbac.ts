/* eslint-disable no-restricted-imports, @typescript-eslint/no-explicit-any, @typescript-eslint/await-thenable */
/**
 * MASTER PROMPT #66: Role-Based Access Control (RBAC) Enforcement
 *
 * This module provides utilities to enforce team member roles and permissions
 * across API routes and UI pages.
 *
 * Role Hierarchy:
 * - ADMIN: Full access to everything (owner/admin)
 * - MANAGER: Can manage most resources except billing and team roles
 * - MEMBER: Can create and edit assigned resources
 * - VIEWER: Read-only access
 *
 * Usage in API Routes:
 * ```typescript
 * import { requireRole, requirePermission } from "@/lib/auth/rbac";
 *
 * export async function DELETE(req: Request) {
 *   await requireRole("ADMIN"); // Throws 403 if not admin
 *   // ... delete logic
 * }
 * ```
 *
 * Usage in Server Components:
 * ```typescript
 * import { checkRole, getCurrentUserRole } from "@/lib/auth/rbac";
 *
 * export default async function AdminPage() {
 *   const { role, hasAccess } = await checkRole("ADMIN");
 *   if (!hasAccess) {
 *     return <AccessDenied requiredRole="ADMIN" currentRole={role} />;
 *   }
 *   // ... render admin UI
 * }
 * ```
 */

/* eslint-disable no-restricted-imports, no-restricted-syntax */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getDelegate } from "@/lib/db/modelAliases";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Role types matching team_members schema
export type TeamRole = "admin" | "manager" | "member" | "viewer";

// Permission types for granular access control
export type Permission =
  | "claims:create"
  | "claims:edit"
  | "claims:delete"
  | "claims:view"
  | "vendors:create"
  | "vendors:edit"
  | "vendors:delete"
  | "vendors:view"
  | "products:create"
  | "products:edit"
  | "products:delete"
  | "products:view"
  | "team:invite"
  | "team:edit"
  | "team:remove"
  | "team:view"
  | "billing:manage"
  | "billing:view"
  | "integrations:manage"
  | "integrations:view"
  | "reports:create"
  | "reports:view"
  | "analytics:view";

// Role hierarchy levels (higher = more permissions)
const ROLE_LEVELS: Record<TeamRole, number> = {
  admin: 4,
  manager: 3,
  member: 2,
  viewer: 1,
};

// Permission matrix: role -> allowed permissions
const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  admin: [
    "claims:create",
    "claims:edit",
    "claims:delete",
    "claims:view",
    "vendors:create",
    "vendors:edit",
    "vendors:delete",
    "vendors:view",
    "products:create",
    "products:edit",
    "products:delete",
    "products:view",
    "team:invite",
    "team:edit",
    "team:remove",
    "team:view",
    "billing:manage",
    "billing:view",
    "integrations:manage",
    "integrations:view",
    "reports:create",
    "reports:view",
    "analytics:view",
  ],
  manager: [
    "claims:create",
    "claims:edit",
    "claims:view",
    "vendors:create",
    "vendors:edit",
    "vendors:view",
    "products:create",
    "products:edit",
    "products:view",
    "team:view",
    "billing:view",
    "integrations:view",
    "reports:create",
    "reports:view",
    "analytics:view",
  ],
  member: [
    "claims:create",
    "claims:edit",
    "claims:view",
    "vendors:view",
    "products:view",
    "team:view",
    "reports:create",
    "reports:view",
  ],
  viewer: ["claims:view", "vendors:view", "products:view", "team:view", "reports:view"],
};

/**
 * Get current user's role in their organization
 * Returns null if user is not authenticated or not a team member
 */
export async function getCurrentUserRole(): Promise<{
  userId: string;
  orgId: string;
  role: TeamRole;
} | null> {
  try {
    const { userId, orgId, sessionClaims } = await auth();
    let effectiveOrgId = orgId || null;

    // Fallback: if Clerk orgId missing, derive from org table by ownerId
    if (userId && !effectiveOrgId) {
      try {
        const membership = await prisma.user_organizations.findFirst({
          where: { userId: userId },
          select: { organizationId: true },
        });
        if (membership) {
          effectiveOrgId = membership.organizationId;
          logger.debug(
            `[RBAC] Derived orgId ${effectiveOrgId} for user ${userId} via membership fallback`
          );
        }
      } catch (e) {
        logger.warn("[RBAC] Failed membership org fallback lookup", e);
      }
    }
    if (!userId || !effectiveOrgId) {
      return null;
    }

    // 🔐 Platform owner override (env-driven, never hardcoded)
    try {
      const platformOwnerEmail = process.env.PLATFORM_OWNER_EMAIL;
      if (platformOwnerEmail) {
        const claims = sessionClaims as Record<string, unknown> | null;
        const ownerEmail = (claims?.email as string) || (claims?.primaryEmailAddress as string);
        if (ownerEmail === platformOwnerEmail) {
          return { userId, orgId: effectiveOrgId, role: "admin" };
        }
      }
    } catch {
      // Non-fatal; continue with normal resolution
    }

    // 🔥 FIX: Use orgId directly from Clerk (stored in app.users table)
    // No need to lookup Org table mapping - Clerk orgId IS our internal orgId

    // Check team_members table for role (uses Clerk orgId directly)
    const teamMember = await getDelegate("teamMember").findUnique({
      where: {
        org_id_userId: {
          org_id: effectiveOrgId, // Use effective orgId
          userId: userId,
        },
      },
      select: { role: true },
    });

    if (!teamMember) {
      // User not in team_members table yet - check user_organizations

      // Check user_organizations table for role
      const userOrg = await prisma.user_organizations.findFirst({
        where: {
          userId: userId,
          organizationId: effectiveOrgId, // Use effective orgId
        },
        select: { role: true },
      });

      // Determine role from user_organizations or default to admin
      let determinedRole: TeamRole;

      if (userOrg?.role === "ADMIN") {
        determinedRole = "admin";
      } else if (userOrg?.role === "MANAGER") {
        determinedRole = "manager";
      } else if (userOrg?.role === "MEMBER") {
        determinedRole = "member";
      } else if (userOrg?.role === "VIEWER") {
        determinedRole = "viewer";
      } else {
        // Default to member — admin must be explicitly assigned
        determinedRole = "member";
      }

      // Auto-update user_organizations role for future queries (lazy initialization)
      try {
        await prisma.user_organizations.updateMany({
          where: {
            userId: userId,
            organizationId: effectiveOrgId,
          },
          data: {
            role: determinedRole.toUpperCase(),
          },
        });
        logger.debug(`[RBAC] Updated user_organizations role for ${userId} to: ${determinedRole}`);
      } catch (updateError) {
        // Ignore errors - not critical for role resolution
        logger.warn("[RBAC] Could not update user_organizations role:", updateError);
      }

      return {
        userId,
        orgId: effectiveOrgId,
        role: determinedRole,
      };
    }

    return {
      userId,
      orgId: effectiveOrgId,
      role: teamMember.role as TeamRole,
    };
  } catch (error) {
    logger.error("[RBAC] Failed to get current user role:", error);
    // � SECURITY FIX: Never auto-grant admin on transient errors.
    // The previous behavior would grant ADMIN on any DB error, which is a
    // privilege escalation vulnerability during transient outages.
    // Callers must handle null (unauthenticated) gracefully.
    return null;
  }
}

/**
 * Synchronous check: does `userRole` meet or exceed `minimumRole`?
 * Use in page components where you already have the role string from context.
 *
 * Replaces: hasMinimumRole() from deprecated @/lib/rbac (System A).
 */
export function hasMinimumRole(
  userRole: string | null | undefined,
  minimumRole: TeamRole
): boolean {
  if (!userRole) return false;
  const normalized = userRole.toLowerCase() as TeamRole;
  const level = ROLE_LEVELS[normalized];
  if (level === undefined) return false;
  return level >= ROLE_LEVELS[minimumRole];
}

/**
 * Check if user has minimum required role
 * Returns { hasAccess, role, userId, orgId }
 */
export async function checkRole(minimumRole: TeamRole): Promise<{
  hasAccess: boolean;
  role: TeamRole | null;
  userId: string | null;
  orgId: string | null;
}> {
  const userRole = await getCurrentUserRole();

  if (!userRole) {
    return {
      hasAccess: false,
      role: null,
      userId: null,
      orgId: null,
    };
  }

  const hasAccess = ROLE_LEVELS[userRole.role] >= ROLE_LEVELS[minimumRole];

  return {
    hasAccess,
    role: userRole.role,
    userId: userRole.userId,
    orgId: userRole.orgId,
  };
}

/**
 * Check if user has specific permission
 */
export async function checkPermission(permission: Permission): Promise<{
  hasAccess: boolean;
  role: TeamRole | null;
}> {
  const userRole = await getCurrentUserRole();

  if (!userRole) {
    return { hasAccess: false, role: null };
  }

  const allowedPermissions = ROLE_PERMISSIONS[userRole.role];
  const hasAccess = allowedPermissions.includes(permission);

  return {
    hasAccess,
    role: userRole.role,
  };
}

/**
 * Require minimum role - throws 403 error if not authorized
 * Use in API routes
 */
export async function requireRole(minimumRole: TeamRole): Promise<{
  userId: string;
  orgId: string;
  role: TeamRole;
}> {
  const { hasAccess, role, userId, orgId } = await checkRole(minimumRole);

  if (!hasAccess) {
    const error: Error & {
      statusCode?: number;
      currentRole?: TeamRole | null;
      requiredRole?: TeamRole;
    } = new Error(
      role
        ? `Insufficient permissions. Required: ${minimumRole}, Current: ${role}`
        : "Authentication required"
    );
    error.statusCode = 403;
    error.currentRole = role;
    error.requiredRole = minimumRole;
    throw error;
  }

  return {
    userId: userId!,
    orgId: orgId!,
    role: role!,
  };
}

/**
 * Require specific permission - throws 403 error if not authorized
 * Use in API routes
 */
export async function requirePermission(permission: Permission): Promise<{
  userId: string;
  orgId: string;
  role: TeamRole;
}> {
  const userRole = await getCurrentUserRole();

  if (!userRole) {
    const error: Error & { statusCode?: number } = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  const allowedPermissions = ROLE_PERMISSIONS[userRole.role];
  if (!allowedPermissions.includes(permission)) {
    const error: Error & {
      statusCode?: number;
      currentRole?: TeamRole;
      requiredPermission?: Permission;
    } = new Error(
      `Permission denied. Required permission: ${permission}, Current role: ${userRole.role}`
    );
    error.statusCode = 403;
    error.currentRole = userRole.role;
    error.requiredPermission = permission;
    throw error;
  }

  return userRole;
}

/**
 * Create 403 Forbidden response for API routes
 */
export function createForbiddenResponse(
  message: string = "Access denied",
  _details?: {
    currentRole?: TeamRole | null;
    requiredRole?: TeamRole;
    requiredPermission?: Permission;
  }
): NextResponse {
  // Never expose internal role details to the client — log them server-side instead
  return NextResponse.json(
    {
      error: message,
      code: "FORBIDDEN",
    },
    { status: 403 }
  );
}

/**
 * Create 401 Unauthorized response for API routes
 */
export function createUnauthorizedResponse(
  message: string = "Authentication required"
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: "UNAUTHORIZED",
    },
    { status: 401 }
  );
}

/** Error shape thrown by requireRole/requirePermission */
interface RbacError extends Error {
  statusCode?: number;
  currentRole?: TeamRole | null;
  requiredRole?: TeamRole;
  requiredPermission?: Permission;
}

/**
 * Middleware helper to wrap API handlers with role check
 */
export function withRole(
  handler: (req: Request, context: Record<string, unknown>) => Promise<NextResponse>,
  minimumRole: TeamRole
) {
  return async (req: Request, context: Record<string, unknown>): Promise<NextResponse> => {
    try {
      await requireRole(minimumRole);
      return await handler(req, context);
    } catch (error: unknown) {
      const rbacErr = error as RbacError;
      if (rbacErr.statusCode === 403) {
        return createForbiddenResponse(rbacErr.message, {
          currentRole: rbacErr.currentRole,
          requiredRole: rbacErr.requiredRole,
        });
      }
      if (rbacErr.statusCode === 401) {
        return createUnauthorizedResponse(rbacErr.message);
      }
      throw error;
    }
  };
}

/**
 * Middleware helper to wrap API handlers with permission check
 */
export function withPermission(
  handler: (req: Request, context: Record<string, unknown>) => Promise<NextResponse>,
  permission: Permission
) {
  return async (req: Request, context: Record<string, unknown>): Promise<NextResponse> => {
    try {
      await requirePermission(permission);
      return await handler(req, context);
    } catch (error: unknown) {
      const rbacErr = error as RbacError;
      if (rbacErr.statusCode === 403) {
        return createForbiddenResponse(rbacErr.message, {
          currentRole: rbacErr.currentRole,
          requiredPermission: rbacErr.requiredPermission,
        });
      }
      if (rbacErr.statusCode === 401) {
        return createUnauthorizedResponse(rbacErr.message);
      }
      throw error;
    }
  };
}
