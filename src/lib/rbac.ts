// RBAC Middleware - Role-Based Access Control
// Phase G Priority 3: Complete RBAC Implementation
// Enforces role hierarchy: OWNER > ADMIN > PM > FIELD_TECH > OFFICE_STAFF > CLIENT

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export type Role = "OWNER" | "ADMIN" | "PM" | "FIELD_TECH" | "OFFICE_STAFF" | "CLIENT";

// Role hierarchy (higher number = more permissions)
export const roleHierarchy: Record<Role, number> = {
  OWNER: 100,
  ADMIN: 80,
  PM: 60,
  FIELD_TECH: 40,
  OFFICE_STAFF: 20,
  CLIENT: 10,
};

// Permission categories
export type Permission =
  | "claims:create"
  | "claims:edit"
  | "claims:delete"
  | "claims:view"
  | "supplements:create"
  | "supplements:approve"
  | "supplements:view"
  | "reports:create"
  | "reports:view"
  | "files:upload"
  | "files:delete"
  | "team:invite"
  | "team:manage"
  | "billing:view"
  | "billing:manage"
  | "org:settings";

// Role permission matrix
export const rolePermissions: Record<Role, Permission[]> = {
  OWNER: [
    "claims:create",
    "claims:edit",
    "claims:delete",
    "claims:view",
    "supplements:create",
    "supplements:approve",
    "supplements:view",
    "reports:create",
    "reports:view",
    "files:upload",
    "files:delete",
    "team:invite",
    "team:manage",
    "billing:view",
    "billing:manage",
    "org:settings",
  ],
  ADMIN: [
    "claims:create",
    "claims:edit",
    "claims:delete",
    "claims:view",
    "supplements:create",
    "supplements:approve",
    "supplements:view",
    "reports:create",
    "reports:view",
    "files:upload",
    "files:delete",
    "team:invite",
    "team:manage",
  ],
  PM: [
    "claims:create",
    "claims:edit",
    "claims:view",
    "supplements:create",
    "supplements:view",
    "reports:create",
    "reports:view",
    "files:upload",
    "files:delete",
  ],
  FIELD_TECH: ["claims:view", "supplements:view", "reports:view", "files:upload"],
  OFFICE_STAFF: ["claims:view", "supplements:view", "reports:view", "files:upload"],
  CLIENT: ["claims:view", "files:upload"],
};

/**
 * Get user's role from database
 */
export async function getUserRole(userId: string, orgId: string): Promise<Role | null> {
  try {
    const user = await prisma.users.findFirst({
      where: {
        clerkUserId: userId,
        orgId: orgId,
      },
      select: {
        role: true,
      },
    });

    return user?.role as Role | null;
  } catch (error) {
    logger.error("[RBAC] Error fetching user role:", error);
    return null;
  }
}

/**
 * Check if user has required permission
 */
export function hasPermission(userRole: Role, permission: Permission): boolean {
  const permissions = rolePermissions[userRole] || [];
  return permissions.includes(permission);
}

/**
 * Check if user has minimum role level
 */
export function hasMinimumRole(userRole: Role, minimumRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[minimumRole];
}

/**
 * Middleware wrapper for API routes - checks permission
 */
export async function requirePermission(permission: Permission) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRole(userId, orgId);

  if (!role) {
    return NextResponse.json({ error: "User role not found" }, { status: 403 });
  }

  if (!hasPermission(role, permission)) {
    return NextResponse.json(
      { error: `Permission denied: ${permission} requires higher role` },
      { status: 403 }
    );
  }

  return null; // Permission granted
}

/**
 * Middleware wrapper for API routes - checks minimum role
 */
export async function requireRole(minimumRole: Role) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = await getUserRole(userId, orgId);

  if (!userRole) {
    return NextResponse.json({ error: "User role not found" }, { status: 403 });
  }

  if (!hasMinimumRole(userRole, minimumRole)) {
    return NextResponse.json(
      { error: `Access denied: requires ${minimumRole} role or higher` },
      { status: 403 }
    );
  }

  return null; // Role check passed
}

/**
 * Get user context with role info
 */
export async function getRoleContext() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return { authenticated: false, role: null, permissions: [] };
  }

  const role = await getUserRole(userId, orgId);

  if (!role) {
    return { authenticated: true, role: null, permissions: [] };
  }

  return {
    authenticated: true,
    role,
    permissions: rolePermissions[role] || [],
    hierarchy: roleHierarchy[role],
  };
}
