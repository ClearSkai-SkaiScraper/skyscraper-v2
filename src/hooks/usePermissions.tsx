"use client";

import { useEffect, useState } from "react";

import type { Permission,TeamRole } from "@/lib/auth/rbac";
import { logger } from "@/lib/logger";

interface PermissionsData {
  role: TeamRole | null;
  permissions: Permission[];
  loading: boolean;
}

/**
 * Client-side hook to check user permissions
 * Fetches from /api/permissions endpoint
 */
export function usePermissions(): PermissionsData {
  const [data, setData] = useState<PermissionsData>({
    role: null,
    permissions: [],
    loading: true,
  });

  useEffect(() => {
    fetch("/api/permissions")
      .then((res) => res.json())
      .then((result) => {
        setData({
          role: result.role,
          permissions: result.permissions,
          loading: false,
        });
      })
      .catch((error) => {
        logger.error("Failed to fetch permissions:", error);
        setData((prev) => ({ ...prev, loading: false }));
      });
  }, []);

  return data;
}

/**
 * Check if user has a specific permission
 */
export function useHasPermission(permission: Permission): boolean {
  const { permissions } = usePermissions();
  return permissions.includes(permission);
}

/**
 * Check if user has ALL of the specified permissions
 */
export function useHasAllPermissions(requiredPermissions: Permission[]): boolean {
  const { permissions } = usePermissions();
  return requiredPermissions.every((p) => permissions.includes(p));
}

/**
 * Check if user has ANY of the specified permissions
 */
export function useHasAnyPermission(requiredPermissions: Permission[]): boolean {
  const { permissions } = usePermissions();
  return requiredPermissions.some((p) => permissions.includes(p));
}

/**
 * Check if user has minimum role level
 */
export function useHasMinRole(minRole: TeamRole): boolean {
  const { role } = usePermissions();
  if (!role) return false;

  const roleHierarchy: Record<TeamRole, number> = {
    viewer: 1,
    member: 2,
    manager: 3,
    admin: 4,
  };

  return roleHierarchy[role] >= roleHierarchy[minRole];
}

/**
 * Component that only renders children if user has permission
 */
export function PermissionGuard({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hasPermission = useHasPermission(permission);
  const { loading } = usePermissions();

  if (loading) {
    return null; // or a loading spinner
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component that only renders children if user has minimum role
 */
export function RoleGuard({
  minRole,
  children,
  fallback = null,
}: {
  minRole: TeamRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hasRole = useHasMinRole(minRole);
  const { loading } = usePermissions();

  if (loading) {
    return null; // or a loading spinner
  }

  return hasRole ? <>{children}</> : <>{fallback}</>;
}
