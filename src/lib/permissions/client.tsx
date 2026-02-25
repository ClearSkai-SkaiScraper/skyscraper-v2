/**
 * Sprint 27 — Client-side permission hooks
 *
 * Fetches role + permissions from /api/permissions and provides
 * hooks for UI gating: useCanDelete, useCanArchive, useCanRemoteView, etc.
 *
 * Replaces: src/hooks/usePermissions.tsx
 */

"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import type { AppRole, Permission } from "@/lib/permissions/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PermissionState {
  role: AppRole | null;
  permissions: Permission[];
  loading: boolean;
  /** true if user role is admin or owner */
  isAdmin: boolean;
  /** true if user role is manager, admin, or owner */
  isManager: boolean;
}

interface PermissionsContextValue extends PermissionState {
  /** Check if user has a specific permission */
  hasPermission: (perm: Permission) => boolean;
  /** Check if user meets minimum role */
  hasMinRole: (minRole: AppRole) => boolean;
  /** Can hard-delete (admin/owner only) */
  canDelete: boolean;
  /** Can soft-delete/archive (member+) */
  canArchive: boolean;
  /** Can use Remote View */
  canRemoteView: boolean;
  /** Refresh permissions from server */
  refresh: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const PermissionsContext = createContext<PermissionsContextValue>({
  role: null,
  permissions: [],
  loading: true,
  isAdmin: false,
  isManager: false,
  hasPermission: () => false,
  hasMinRole: () => false,
  canDelete: false,
  canArchive: false,
  canRemoteView: false,
  refresh: () => {},
});

const ROLE_LEVELS: Record<AppRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 2,
  viewer: 1,
};

// ─── Provider ────────────────────────────────────────────────────────────────

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PermissionState>({
    role: null,
    permissions: [],
    loading: true,
    isAdmin: false,
    isManager: false,
  });

  const fetchPermissions = useCallback(() => {
    fetch("/api/permissions")
      .then((res) => res.json())
      .then((data) => {
        const role = (data.role as AppRole) || null;
        const permissions = (data.permissions as Permission[]) || [];
        const level = role ? (ROLE_LEVELS[role] ?? 0) : 0;

        setState({
          role,
          permissions,
          loading: false,
          isAdmin: level >= ROLE_LEVELS.admin,
          isManager: level >= ROLE_LEVELS.manager,
        });
      })
      .catch(() => {
        setState((prev) => ({ ...prev, loading: false }));
      });
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (perm: Permission): boolean => {
      if (!state.role) return false;
      if (state.permissions.includes(perm)) return true;
      // Check for "manage" wildcard
      const [resource] = perm.split(":");
      return state.permissions.includes(`${resource}:manage` as Permission);
    },
    [state.role, state.permissions]
  );

  const hasMinRole = useCallback(
    (minRole: AppRole): boolean => {
      if (!state.role) return false;
      return (ROLE_LEVELS[state.role] ?? 0) >= (ROLE_LEVELS[minRole] ?? 99);
    },
    [state.role]
  );

  const value: PermissionsContextValue = {
    ...state,
    hasPermission,
    hasMinRole,
    canDelete: state.isAdmin, // admin/owner only
    canArchive: hasMinRole("member"),
    canRemoteView: hasMinRole("manager"), // manager/admin/owner
    refresh: fetchPermissions,
  };

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Get the full permissions context */
export function useAppPermissions() {
  return useContext(PermissionsContext);
}

/** Check a single permission */
export function useHasPerm(perm: Permission): boolean {
  const { hasPermission, loading } = useContext(PermissionsContext);
  if (loading) return false;
  return hasPermission(perm);
}

/** Check minimum role level */
export function useHasMinRole(minRole: AppRole): boolean {
  const { hasMinRole, loading } = useContext(PermissionsContext);
  if (loading) return false;
  return hasMinRole(minRole);
}

/** Can the current user hard-delete? */
export function useCanDelete(): boolean {
  return useContext(PermissionsContext).canDelete;
}

/** Can the current user archive (soft-delete)? */
export function useCanArchive(): boolean {
  return useContext(PermissionsContext).canArchive;
}

// ─── UI Guard Components ─────────────────────────────────────────────────────

/**
 * Only renders children if the user has the specified permission.
 */
export function PermGuard({
  perm,
  children,
  fallback = null,
}: {
  perm: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission, loading } = useContext(PermissionsContext);
  if (loading) return null;
  return hasPermission(perm) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Only renders children if user meets minimum role.
 */
export function RoleGuard({
  minRole,
  children,
  fallback = null,
}: {
  minRole: AppRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasMinRole, loading } = useContext(PermissionsContext);
  if (loading) return null;
  return hasMinRole(minRole) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Renders a delete button for admin/owner, or an archive button for members.
 * Viewers see nothing.
 */
export function DeleteOrArchiveButton({
  onDelete,
  onArchive,
  label = "Remove",
  className = "",
}: {
  onDelete: () => void;
  onArchive: () => void;
  label?: string;
  className?: string;
}) {
  const { canDelete, canArchive, loading } = useContext(PermissionsContext);

  if (loading) return null;

  if (canDelete) {
    return (
      <button
        onClick={onDelete}
        className={`inline-flex items-center gap-1.5 rounded-lg bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-600/30 ${className}`}
      >
        🗑️ Delete {label}
      </button>
    );
  }

  if (canArchive) {
    return (
      <button
        onClick={onArchive}
        className={`inline-flex items-center gap-1.5 rounded-lg bg-amber-600/20 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-600/30 ${className}`}
      >
        📦 Archive {label}
      </button>
    );
  }

  // Viewers see nothing
  return null;
}
