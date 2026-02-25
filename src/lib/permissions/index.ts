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

// ─── Legacy re-exports (backward compat) ────────────────────────────────────
export {
  canAccessProject,
  getAccessibleProjects,
  getAllRoles,
  getCurrentUserPermissions,
  getRoleDisplayName,
  hasAllPermissions,
  hasPermission,
  requireAnyPermission,
  requirePermission,
  withPermission,
  withResourceAccess,
} from "./legacy";

// Also re-export legacy types with their original names
export type { Permission as LegacyPermission, Role } from "./legacy";

// ─── Sprint 27 new exports ──────────────────────────────────────────────────
export {
  // Constants
  ALL_ROLES,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,

  // Helpers
  canArchive,
  canDelete,
  canUseRemoteView,
  hasMinRole,
  normalizeRole,
  roleBadgeColor,
  roleHasPermission,
  roleLabel,
  type Permission as AppPermission,
  // Types
  type AppRole,
  type PermissionAction,
  type PermissionResource,
} from "./constants";
