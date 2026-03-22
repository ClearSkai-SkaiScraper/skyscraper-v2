/**
 * Sprint 27 — Server-side permission checking
 *
 * Uses the unified permission constants to check access server-side.
 * Works with any auth resolver (Clerk, safeOrgContext, getActiveOrgSafe).
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

import {
  type AppRole,
  hasMinRole,
  normalizeRole,
  type Permission,
  type PermissionResource,
  roleHasPermission,
} from "./constants";

// ─── Resolve Current User's Role ─────────────────────────────────────────────

/**
 * Get the current authenticated user's role in their organization.
 * Single entry point — replaces getCurrentUserRole in rbac.ts.
 */
export async function resolveUserRole(): Promise<{
  userId: string;
  orgId: string;
  role: AppRole;
} | null> {
  try {
    const { userId, orgId, sessionClaims } = await auth();
    let effectiveOrgId = orgId || null;

    // Fallback: derive orgId from user_organizations membership
    if (userId && !effectiveOrgId) {
      try {
        const membership = await prisma.user_organizations.findFirst({
          where: { userId },
          select: { organizationId: true },
        });
        if (membership) {
          effectiveOrgId = membership.organizationId;
        }
      } catch (e) {
        logger.warn("[permissions] Failed org lookup fallback", e);
      }
    }

    if (!userId || !effectiveOrgId) return null;

    // Platform owner override
    try {
      const ownerEmail =
        (sessionClaims as any)?.email || (sessionClaims as any)?.primaryEmailAddress;
      if (ownerEmail === "buildingwithdamienray@gmail.com") {
        return { userId, orgId: effectiveOrgId, role: "owner" };
      }
    } catch (ownerCheckErr) {
      logger.warn("[PERMISSIONS] Owner override check failed:", ownerCheckErr);
    }

    // Check user_organizations for role
    const userOrg = await prisma.user_organizations.findFirst({
      where: { userId, organizationId: effectiveOrgId },
      select: { role: true },
    });

    const role = normalizeRole(userOrg?.role);

    return { userId, orgId: effectiveOrgId, role };
  } catch (error) {
    logger.error("[permissions] resolveUserRole failed:", error);
    return null;
  }
}

// ─── Server Guards (throw on failure) ────────────────────────────────────────

/**
 * Require minimum role level. Throws 403 on failure.
 */
export async function requireMinRole(minRole: AppRole): Promise<{
  userId: string;
  orgId: string;
  role: AppRole;
}> {
  const user = await resolveUserRole();
  if (!user) {
    throw Object.assign(new Error("Authentication required"), { statusCode: 401 });
  }
  if (!hasMinRole(user.role, minRole)) {
    throw Object.assign(
      new Error(`Insufficient permissions. Required: ${minRole}, Current: ${user.role}`),
      { statusCode: 403, currentRole: user.role, requiredRole: minRole }
    );
  }
  return user;
}

/**
 * Require a specific permission. Throws 403 on failure.
 */
export async function requirePerm(perm: Permission): Promise<{
  userId: string;
  orgId: string;
  role: AppRole;
}> {
  const user = await resolveUserRole();
  if (!user) {
    throw Object.assign(new Error("Authentication required"), { statusCode: 401 });
  }
  if (!roleHasPermission(user.role, perm)) {
    throw Object.assign(new Error(`Permission denied: ${perm} (role: ${user.role})`), {
      statusCode: 403,
      currentRole: user.role,
      requiredPermission: perm,
    });
  }
  return user;
}

// ─── API Route Wrappers (return NextResponse on failure) ─────────────────────

/**
 * Wrap an API route handler with role enforcement.
 * Returns 401/403 JSON instead of throwing.
 */
export function withMinRole(
  handler: (
    req: Request,
    ctx: { userId: string; orgId: string; role: AppRole }
  ) => Promise<NextResponse>,
  minRole: AppRole
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      const user = await requireMinRole(minRole);
      return await handler(req, user);
    } catch (err: any) {
      if (err.statusCode === 401) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      if (err.statusCode === 403) {
        return NextResponse.json(
          { error: err.message, currentRole: err.currentRole, requiredRole: err.requiredRole },
          { status: 403 }
        );
      }
      throw err;
    }
  };
}

/**
 * Wrap an API route handler with permission enforcement.
 */
export function withPerm(
  handler: (
    req: Request,
    ctx: { userId: string; orgId: string; role: AppRole }
  ) => Promise<NextResponse>,
  perm: Permission
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      const user = await requirePerm(perm);
      return await handler(req, user);
    } catch (err: any) {
      if (err.statusCode === 401) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      if (err.statusCode === 403) {
        return NextResponse.json(
          { error: err.message, currentRole: err.currentRole },
          { status: 403 }
        );
      }
      throw err;
    }
  };
}

// ─── Delete vs Archive Check ─────────────────────────────────────────────────

/**
 * Check if the current user can hard-delete a resource.
 * If not, returns { canDelete: false, shouldArchive: true }.
 */
export async function checkDeletePermission(resource: PermissionResource): Promise<{
  canDelete: boolean;
  shouldArchive: boolean;
  userId: string;
  orgId: string;
  role: AppRole;
}> {
  const user = await resolveUserRole();
  if (!user) {
    throw Object.assign(new Error("Authentication required"), { statusCode: 401 });
  }

  const deletePermission = `${resource}:delete` as Permission;
  const archivePermission = `${resource}:archive` as Permission;

  const canDel = roleHasPermission(user.role, deletePermission);
  const canArc = roleHasPermission(user.role, archivePermission);

  return {
    canDelete: canDel,
    shouldArchive: !canDel && canArc,
    ...user,
  };
}
