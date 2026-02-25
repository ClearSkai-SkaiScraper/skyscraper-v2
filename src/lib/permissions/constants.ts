/**
 * Sprint 27 — Unified Role Permissions System
 *
 * Single source of truth for all role definitions, permission matrices,
 * and hierarchy levels across the entire platform.
 *
 * Replaces the 5 competing RBAC systems:
 *   - src/lib/rbac.ts          (OWNER/ADMIN/PM/FIELD_TECH/OFFICE_STAFF/CLIENT)
 *   - src/lib/auth/rbac.ts     (admin/manager/member/viewer)
 *   - src/middleware/rbac.ts    (admin/manager/member with resource+action)
 *   - Prisma enum Role          (ADMIN/MANAGER/PM/INSPECTOR/BILLING/VENDOR/USER)
 *   - tradesCompanyMember       (free-text role + isOwner/isAdmin/isManager booleans)
 *
 * Canonical role hierarchy:
 *   owner (5) > admin (4) > manager (3) > member (2) > viewer (1)
 */

// ─── Role Types ──────────────────────────────────────────────────────────────

export type AppRole = "owner" | "admin" | "manager" | "member" | "viewer";

/** Numeric hierarchy — higher = more authority */
export const ROLE_HIERARCHY: Record<AppRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 2,
  viewer: 1,
};

export const ALL_ROLES: AppRole[] = ["owner", "admin", "manager", "member", "viewer"];

// ─── Permission Types ────────────────────────────────────────────────────────

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "archive" // New in Sprint 27 — soft-delete
  | "delete" // Hard delete — admin/owner only
  | "manage"; // Full control (includes all above)

export type PermissionResource =
  | "claims"
  | "leads"
  | "contacts"
  | "vendors"
  | "products"
  | "documents"
  | "reports"
  | "messages"
  | "analytics"
  | "financials"
  | "team"
  | "billing"
  | "integrations"
  | "settings"
  | "remote_view"; // Sprint 27: view-as-employee

export type Permission = `${PermissionResource}:${PermissionAction}`;

// ─── Permission Matrix ───────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  owner: [
    // Owners can do everything
    "claims:manage",
    "leads:manage",
    "contacts:manage",
    "vendors:manage",
    "products:manage",
    "documents:manage",
    "reports:manage",
    "messages:manage",
    "analytics:manage",
    "financials:manage",
    "team:manage",
    "billing:manage",
    "integrations:manage",
    "settings:manage",
    "remote_view:manage",
  ],
  admin: [
    // Admins can do everything except billing:manage (owner only)
    "claims:manage",
    "leads:manage",
    "contacts:manage",
    "vendors:manage",
    "products:manage",
    "documents:manage",
    "reports:manage",
    "messages:manage",
    "analytics:manage",
    "financials:manage",
    "team:manage",
    "billing:view",
    "integrations:manage",
    "settings:manage",
    "remote_view:manage",
  ],
  manager: [
    // Managers: full CRUD on work resources, can archive but NOT delete
    "claims:create",
    "claims:edit",
    "claims:archive",
    "claims:view",
    "leads:create",
    "leads:edit",
    "leads:archive",
    "leads:view",
    "contacts:create",
    "contacts:edit",
    "contacts:archive",
    "contacts:view",
    "vendors:create",
    "vendors:edit",
    "vendors:view",
    "products:create",
    "products:edit",
    "products:view",
    "documents:create",
    "documents:edit",
    "documents:archive",
    "documents:view",
    "reports:create",
    "reports:view",
    "messages:create",
    "messages:edit",
    "messages:view",
    "analytics:view",
    "financials:view",
    "team:view",
    "billing:view",
    "integrations:view",
    "settings:view",
  ],
  member: [
    // Members: create + edit assigned, archive but NOT delete, read most
    "claims:create",
    "claims:edit",
    "claims:archive",
    "claims:view",
    "leads:create",
    "leads:edit",
    "leads:view",
    "contacts:create",
    "contacts:edit",
    "contacts:view",
    "vendors:view",
    "products:view",
    "documents:create",
    "documents:edit",
    "documents:view",
    "reports:create",
    "reports:view",
    "messages:create",
    "messages:edit",
    "messages:view",
    "analytics:view",
    "team:view",
  ],
  viewer: [
    // Viewers: read-only across the board
    "claims:view",
    "leads:view",
    "contacts:view",
    "vendors:view",
    "products:view",
    "documents:view",
    "reports:view",
    "messages:view",
    "analytics:view",
    "team:view",
  ],
};

// ─── Helper Functions ────────────────────────────────────────────────────────

/** Check if roleA has higher or equal authority than roleB */
export function hasMinRole(userRole: AppRole, requiredRole: AppRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/** Action hierarchy for "manage" expansion: manage includes all sub-actions */
const ACTION_HIERARCHY: Record<PermissionAction, number> = {
  view: 1,
  create: 2,
  edit: 3,
  archive: 4,
  delete: 5,
  manage: 6,
};

/**
 * Check if a role has a specific permission.
 * "manage" on a resource implies all other actions on that resource.
 */
export function roleHasPermission(role: AppRole, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;

  // Direct match
  if (perms.includes(permission)) return true;

  // Check if user has "manage" on the same resource (implies all actions)
  const [resource] = permission.split(":") as [PermissionResource, PermissionAction];
  const manageKey = `${resource}:manage` as Permission;
  return perms.includes(manageKey);
}

/**
 * Check if a role can perform a destructive action (delete).
 * Only admin and owner can hard-delete. Everyone else must archive.
 */
export function canDelete(role: AppRole): boolean {
  return hasMinRole(role, "admin");
}

/**
 * Check if a role can archive (soft-delete).
 * Members and above can archive; viewers cannot.
 */
export function canArchive(role: AppRole): boolean {
  return hasMinRole(role, "member");
}

/**
 * Check if a role can use Remote View.
 * - owner/admin: can view any team member
 * - manager: can view direct reports
 * - member/viewer: no access
 */
export function canUseRemoteView(role: AppRole): boolean {
  return hasMinRole(role, "manager");
}

/**
 * Normalize incoming role strings from various sources to AppRole.
 * Handles case mismatches, legacy names, boolean flags, etc.
 */
export function normalizeRole(raw: string | null | undefined): AppRole {
  if (!raw) return "member";
  const lower = raw.toLowerCase().trim();

  // Direct matches
  if (lower === "owner") return "owner";
  if (lower === "admin") return "admin";
  if (lower === "manager") return "manager";
  if (lower === "member") return "member";
  if (lower === "viewer") return "viewer";

  // Legacy Prisma enum mappings
  if (lower === "pm" || lower === "project_manager") return "manager";
  if (lower === "field_tech" || lower === "inspector" || lower === "sales_rep") return "member";
  if (lower === "office_staff" || lower === "billing" || lower === "finance") return "member";
  if (lower === "vendor") return "member";
  if (lower === "user") return "member";
  if (lower === "client") return "viewer";

  // Fallback
  return "member";
}

/**
 * Get a human-readable label for a role
 */
export function roleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    owner: "Owner",
    admin: "Admin",
    manager: "Manager",
    member: "Member",
    viewer: "Viewer",
  };
  return labels[role] || "Member";
}

/**
 * Get the badge color class for a role (Tailwind)
 */
export function roleBadgeColor(role: AppRole): string {
  const colors: Record<AppRole, string> = {
    owner: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    admin: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    manager: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    member: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    viewer: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };
  return colors[role] || colors.member;
}
