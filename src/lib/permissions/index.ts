/**
 * Sprint 27 — Unified Permissions Module
 *
 * Import from here:
 *   import { AppRole, hasMinRole, ROLE_PERMISSIONS } from "@/lib/permissions";
 *   import { resolveUserRole, requireMinRole } from "@/lib/permissions/server";
 *   import { useAppPermissions, PermGuard } from "@/lib/permissions/client";
 *   import { getEffectiveUserId, blockIfRemoteView } from "@/lib/permissions/remoteView";
 */

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
  // Types
  type AppRole,
  type Permission,
  type PermissionAction,
  type PermissionResource,
} from "./constants";
