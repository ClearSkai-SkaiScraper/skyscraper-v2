/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Enforces permissions based on user roles.
 * Prevents unauthorized actions by checking role + resource + action.
 *
 * Usage:
 * await enforcePermission(userId, orgId, 'claims', 'edit');
 * await enforcePermission(userId, orgId, 'financials', 'view');
 */

import prisma from "@/lib/prisma";

export type Resource =
  | "claims"
  | "leads"
  | "clients"
  | "financials"
  | "team"
  | "settings"
  | "documents"
  | "messages"
  | "analytics";

export type Action = "view" | "create" | "edit" | "delete" | "manage";

export interface Permission {
  resource: Resource;
  action: Action;
}

/**
 * Default role permissions
 */
const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    // Admins can do everything
    { resource: "claims", action: "manage" },
    { resource: "leads", action: "manage" },
    { resource: "clients", action: "manage" },
    { resource: "financials", action: "manage" },
    { resource: "team", action: "manage" },
    { resource: "settings", action: "manage" },
    { resource: "documents", action: "manage" },
    { resource: "messages", action: "manage" },
    { resource: "analytics", action: "manage" },
  ],
  manager: [
    // Managers can do most things except team/settings management
    { resource: "claims", action: "edit" },
    { resource: "leads", action: "edit" },
    { resource: "clients", action: "edit" },
    { resource: "financials", action: "view" },
    { resource: "team", action: "view" },
    { resource: "settings", action: "view" },
    { resource: "documents", action: "edit" },
    { resource: "messages", action: "edit" },
    { resource: "analytics", action: "view" },
  ],
  member: [
    // Members can view and create, but limited editing
    { resource: "claims", action: "view" },
    { resource: "leads", action: "create" },
    { resource: "clients", action: "view" },
    { resource: "financials", action: "view" },
    { resource: "team", action: "view" },
    { resource: "documents", action: "view" },
    { resource: "messages", action: "edit" },
    { resource: "analytics", action: "view" },
  ],
};

/**
 * Check if action is allowed based on permission level
 */
function actionAllowed(userPermission: Action, requiredAction: Action): boolean {
  const hierarchy: Record<Action, number> = {
    view: 1,
    create: 2,
    edit: 3,
    delete: 4,
    manage: 5,
  };

  return hierarchy[userPermission] >= hierarchy[requiredAction];
}

/**
 * Get user's role in organization
 */
async function getUserRole(userId: string, orgId: string): Promise<string> {
  const userOrg = await prisma.user_organizations.findFirst({
    where: {
      userId,
      organizationId: orgId,
    },
    select: {
      role: true,
    },
  });

  return userOrg?.role || "member";
}

/**
 * Get permissions for a role
 */
async function getRolePermissions(role: string, _orgId: string): Promise<Permission[]> {
  // Database-backed custom permissions are not available in the current schema.
  // Fall back to default permissions.
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.member;
}

/**
 * Check if user has permission to perform action on resource
 */
export async function hasPermission(
  userId: string,
  orgId: string,
  resource: Resource,
  action: Action
): Promise<boolean> {
  // Get user's role
  const role = await getUserRole(userId, orgId);

  // Admin always has permission
  if (role === "admin") {
    return true;
  }

  // Get role's permissions
  const permissions = await getRolePermissions(role, orgId);

  // Check if permission exists for this resource
  const resourcePermission = permissions.find((p) => p.resource === resource);

  if (!resourcePermission) {
    return false;
  }

  // Check if action is allowed
  return actionAllowed(resourcePermission.action, action);
}

/**
 * Enforce permission - throws error if not allowed
 */
export async function enforcePermission(
  userId: string,
  orgId: string,
  resource: Resource,
  action: Action
): Promise<void> {
  const allowed = await hasPermission(userId, orgId, resource, action);

  if (!allowed) {
    throw new Error(`Permission denied: ${action} ${resource}`);
  }
}

/**
 * Get all permissions for a user (for UI purposes)
 */
export async function getUserPermissions(userId: string, orgId: string): Promise<Permission[]> {
  const role = await getUserRole(userId, orgId);
  return getRolePermissions(role, orgId);
}

/**
 * Middleware wrapper for API routes
 */
export function withPermission(resource: Resource, action: Action) {
  return async (userId: string, orgId: string) => {
    await enforcePermission(userId, orgId, resource, action);
  };
}
