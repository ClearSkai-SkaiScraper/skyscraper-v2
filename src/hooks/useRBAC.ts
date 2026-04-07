// RBAC Hook - Client-side role checking
// Consumes /api/rbac/me which returns System B canonical roles (lowercase)
// Usage: const { role, can } = useRBAC(); if (can("claims:delete")) { ... }

"use client";

import { logger } from "@/lib/logger";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

/** System B canonical roles (lowercase) */
export type Role = "admin" | "manager" | "member" | "viewer";

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

const rolePermissions: Record<Role, Permission[]> = {
  admin: [
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
  manager: [
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
  member: ["claims:view", "supplements:view", "reports:view", "files:upload"],
  viewer: ["claims:view", "reports:view"],
};

const roleHierarchy: Record<Role, number> = {
  admin: 4,
  manager: 3,
  member: 2,
  viewer: 1,
};

interface RBACContext {
  role: Role | null;
  loading: boolean;
  can: (permission: Permission) => boolean;
  isMinimumRole: (minimumRole: Role) => boolean;
}

export function useRBAC(): RBACContext {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    async function fetchRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/rbac/me");
        if (res.ok) {
          const data = await res.json();
          setRole(data.role);
        } else {
          setRole(null);
        }
      } catch (error) {
        logger.error("[useRBAC] Error fetching role:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    void fetchRole();
  }, [user, isLoaded]);

  const can = (permission: Permission): boolean => {
    if (!role) return false;
    const permissions = rolePermissions[role] || [];
    return permissions.includes(permission);
  };

  const isMinimumRole = (minimumRole: Role): boolean => {
    if (!role) return false;
    return (roleHierarchy[role] ?? 0) >= (roleHierarchy[minimumRole] ?? 0);
  };

  return {
    role,
    loading,
    can,
    isMinimumRole,
  };
}
