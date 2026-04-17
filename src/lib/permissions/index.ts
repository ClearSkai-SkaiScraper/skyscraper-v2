/**
 * Sprint 27 — Unified Permissions Module
 *
 * This file re-exports BOTH the legacy permissions (getCurrentUserPermissions,
 * requirePermission, etc.) AND the new Sprint 27 unified system.
 *
 * Legacy callers:
 *   import { getCurrentUserPermissions, requirePermission } from "@/lib/permissions";
 *
 * Sprint 27 callers:
 *   import { AppRole, hasMinRole, ROLE_PERMISSIONS } from "@/lib/permissions";
 *   import { resolveUserRole, requireMinRole } from "@/lib/permissions/server";
 *   import { useAppPermissions, PermGuard } from "@/lib/permissions/client";
 *   import { getEffectiveUserId, blockIfRemoteView } from "@/lib/permissions/remoteView";
 */

// ─── Legacy shims (backward compat) ────────────────────────────────────────
// System A `src/lib/permissions/legacy.ts` was retired. These shims keep old
// call-sites compiling and delegate to the canonical System B RBAC.

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";

import {
  checkRole,
  getCurrentUserRole,
  requirePermission as rbacRequirePermission,
  type TeamRole,
} from "@/lib/auth/rbac";
import { getTenantOrgId } from "@/lib/auth/tenant";

export type Role = TeamRole;
export type LegacyPermission = string;

/** Legacy helper — returns { userId, orgId, role, permissions[], needsInitialization } for compat. */
export async function getCurrentUserPermissions(): Promise<{
  userId: string | null;
  orgId: string | null;
  role: TeamRole | null;
  permissions: string[];
  needsInitialization: boolean;
}> {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();
  if (!userId) {
    return { userId: null, orgId: null, role: null, permissions: [], needsInitialization: false };
  }
  const orgId = await getTenantOrgId().catch(() => null);
  if (!orgId) {
    return { userId, orgId: null, role: null, permissions: [], needsInitialization: true };
  }
  const ctx = await getCurrentUserRole().catch(() => null);
  return {
    userId,
    orgId,
    role: ctx?.role ?? null,
    permissions: [],
    needsInitialization: false,
  };
}

/** Legacy helper — delegates to canonical `requirePermission`. */
export async function requirePermission(permission: string): Promise<void> {
  await rbacRequirePermission(permission as never);
}

/** Legacy helper — cheap boolean check. */
export async function hasPermission(permission: string): Promise<boolean> {
  try {
    await rbacRequirePermission(permission as never);
    return true;
  } catch {
    return false;
  }
}

export const hasAllPermissions = async (perms: string[]): Promise<boolean> => {
  for (const p of perms) if (!(await hasPermission(p))) return false;
  return true;
};

export const requireAnyPermission = async (perms: string[]): Promise<void> => {
  for (const p of perms) {
    if (await hasPermission(p)) return;
  }
  throw new Response("Forbidden", { status: 403 });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withPermission<T extends (...args: any[]) => any>(
  _permission: string,
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    await requirePermission(_permission);
    return handler(...args);
  }) as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withResourceAccess<T extends (...args: any[]) => any>(
  _resource: string,
  handler: T
): T {
  return handler;
}

export async function canAccessProject(_projectId: string): Promise<boolean> {
  const { hasAccess } = await checkRole("member");
  return hasAccess;
}

export async function getAccessibleProjects(): Promise<string[]> {
  return [];
}

export function getAllRoles(): TeamRole[] {
  return ["admin", "manager", "member", "viewer"];
}

export function getRoleDisplayName(role: TeamRole | null | undefined): string {
  if (!role) return "Member";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

// ─── Sprint 27 new exports ──────────────────────────────────────────────────
export {
  // Constants
  ALL_ROLES,
  type Permission as AppPermission,
  // Types
  type AppRole,
  // Helpers
  canArchive,
  canDelete,
  canUseRemoteView,
  hasMinRole,
  normalizeRole,
  type PermissionAction,
  type PermissionResource,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  roleBadgeColor,
  roleHasPermission,
  roleLabel,
} from "./constants";
