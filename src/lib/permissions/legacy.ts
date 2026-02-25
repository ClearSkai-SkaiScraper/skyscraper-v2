import { auth } from "@clerk/nextjs/server";

import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";

// Prisma singleton imported from @/lib/db/prisma

export type Role =
  | "ADMIN" // Owner/Admin - everything
  | "MANAGER" // Manager - everything except billing/roles
  | "PM" // Estimator/PM - projects, estimates, claims, documents, tasks
  | "INSPECTOR" // Inspector - inspections, photos, notes
  | "BILLING" // Billing - invoices, payments
  | "VENDOR" // Vendor - read-only assigned jobs + file uploads
  | "USER"; // Viewer - read-only

export type Permission =
  | "create_projects"
  | "edit_projects"
  | "delete_projects"
  | "view_projects"
  | "create_estimates"
  | "edit_estimates"
  | "view_estimates"
  | "create_inspections"
  | "edit_inspections"
  | "view_inspections"
  | "create_claims"
  | "edit_claims"
  | "view_claims"
  | "create_documents"
  | "edit_documents"
  | "view_documents"
  | "create_tasks"
  | "edit_tasks"
  | "view_tasks"
  | "manage_users"
  | "manage_billing"
  | "view_analytics"
  | "use_ai_features"
  | "export_data";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    "create_projects",
    "edit_projects",
    "delete_projects",
    "view_projects",
    "create_estimates",
    "edit_estimates",
    "view_estimates",
    "create_inspections",
    "edit_inspections",
    "view_inspections",
    "create_claims",
    "edit_claims",
    "view_claims",
    "create_documents",
    "edit_documents",
    "view_documents",
    "create_tasks",
    "edit_tasks",
    "view_tasks",
    "manage_users",
    "manage_billing",
    "view_analytics",
    "use_ai_features",
    "export_data",
  ],
  MANAGER: [
    "create_projects",
    "edit_projects",
    "delete_projects",
    "view_projects",
    "create_estimates",
    "edit_estimates",
    "view_estimates",
    "create_inspections",
    "edit_inspections",
    "view_inspections",
    "create_claims",
    "edit_claims",
    "view_claims",
    "create_documents",
    "edit_documents",
    "view_documents",
    "create_tasks",
    "edit_tasks",
    "view_tasks",
    "view_analytics",
    "use_ai_features",
    "export_data",
  ],
  PM: [
    "create_projects",
    "edit_projects",
    "view_projects",
    "create_estimates",
    "edit_estimates",
    "view_estimates",
    "create_claims",
    "edit_claims",
    "view_claims",
    "create_documents",
    "edit_documents",
    "view_documents",
    "create_tasks",
    "edit_tasks",
    "view_tasks",
    "use_ai_features",
  ],
  INSPECTOR: [
    "create_inspections",
    "edit_inspections",
    "view_inspections",
    "view_projects",
    "create_documents",
    "view_documents",
    "view_tasks",
    "use_ai_features",
  ],
  BILLING: [
    "view_projects",
    "view_estimates",
    "view_claims",
    "manage_billing",
    "view_analytics",
    "export_data",
  ],
  VENDOR: ["view_projects", "view_documents", "create_documents"],
  USER: [
    "view_projects",
    "view_estimates",
    "view_inspections",
    "view_claims",
    "view_documents",
    "view_tasks",
  ],
};

/**
 * Get current user's role and permissions
 */
export async function getCurrentUserPermissions() {
  let { userId } = await auth();

  // Test bypass: provide synthetic user/org context without real Clerk when running Playwright.
  if (!userId && process.env.TEST_AUTH_BYPASS === "1" && process.env.TEST_AUTH_USER_ID) {
    userId = process.env.TEST_AUTH_USER_ID;
  }

  if (!userId) {
    return { role: null, permissions: [], userId: null, orgId: null };
  }

  // Resolve org context via canonical resolver (auto-creates personal org if missing)
  const ctx = await getActiveOrgContext({ required: true });
  if (!ctx.ok) {
    return { role: null, permissions: [], userId, orgId: null, needsInitialization: true };
  }

  const normalizedRole = (ctx.role || "USER").toUpperCase();
  const roleKey =
    normalizedRole === "OWNER" ? "ADMIN" : (normalizedRole as keyof typeof ROLE_PERMISSIONS);
  const permissions = ROLE_PERMISSIONS[roleKey] || [];

  return {
    role: roleKey as any,
    permissions,
    userId,
    orgId: ctx.orgId,
    needsInitialization: false,
  };
}

/**
 * Check if current user has a specific permission
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
  const { permissions } = await getCurrentUserPermissions();
  return (permissions as Permission[]).includes(permission);
}

/**
 * Check if current user has any of the specified permissions
 */
export async function hasAnyPermission(permissions: Permission[]): Promise<boolean> {
  const { permissions: userPermissions } = await getCurrentUserPermissions();
  return permissions.some((p) => (userPermissions as Permission[]).includes(p));
}

/**
 * Check if current user has all of the specified permissions
 */
export async function hasAllPermissions(permissions: Permission[]): Promise<boolean> {
  const { permissions: userPermissions } = await getCurrentUserPermissions();
  return permissions.every((p) => (userPermissions as Permission[]).includes(p));
}

/**
 * Require specific permission - throws error if not authorized
 */
export async function requirePermission(permission: Permission) {
  const hasAccess = await hasPermission(permission);
  if (!hasAccess) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

/**
 * Require any of the specified permissions - throws error if not authorized
 */
export async function requireAnyPermission(permissions: Permission[]) {
  const hasAccess = await hasAnyPermission(permissions);
  if (!hasAccess) {
    throw new Error(`Permission denied: one of [${permissions.join(", ")}]`);
  }
}

/**
 * Check if user can access a specific project
 */
export async function canAccessProject(projectId: string): Promise<boolean> {
  const { userId, orgId, role } = await getCurrentUserPermissions();

  if (!userId || !orgId) return false;

  // Admins and managers can access all projects in their org
  if (role === "ADMIN" || role === "MANAGER") return true;

  const project = await prisma.projects.findFirst({
    where: {
      id: projectId,
      orgId,
    },
  });

  if (!project) return false;

  // Check if user is assigned to the project
  if (project.assignedTo === userId || project.createdBy === userId) {
    return true;
  }

  // For other roles, check if they have view permissions
  return await hasPermission("view_projects");
}

/**
 * Filter projects based on user's role and assignments
 */
export async function getAccessibleProjects() {
  const { userId, orgId, role } = await getCurrentUserPermissions();

  if (!userId || !orgId) {
    throw new Error("User not authenticated");
  }

  let where: any = { orgId };

  // Non-admin users might have restricted access
  if (role !== "ADMIN" && role !== "MANAGER") {
    // Vendors and inspectors only see assigned projects
    if (role === "VENDOR" || role === "INSPECTOR") {
      where.OR = [{ assignedTo: userId }, { createdBy: userId }];
    }
  }

  return await prisma.projects.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Middleware function for API routes to check permissions
 */
export function withPermission(permission: Permission) {
  return async (req: Request, handler: (req: Request) => Promise<Response>) => {
    try {
      await requirePermission(permission);
      return await handler(req);
    } catch (error) {
      return Response.json({ error: "Permission denied" }, { status: 403 });
    }
  };
}

/**
 * Middleware function to check if user can access specific resource
 */
export function withResourceAccess(
  resourceType: "project" | "claim" | "inspection",
  getResourceId: (req: Request) => string
) {
  return async (req: Request, handler: (req: Request) => Promise<Response>) => {
    try {
      const resourceId = getResourceId(req);
      const { orgId } = await getCurrentUserPermissions();

      if (!orgId) {
        throw new Error("Not authenticated");
      }

      // Check if resource belongs to user's org
      let resource;
      switch (resourceType) {
        case "project":
          resource = await prisma.projects.findFirst({
            where: { id: resourceId, orgId },
          });
          break;
        case "claim":
          resource = await prisma.claims.findFirst({
            where: { id: resourceId, orgId },
          });
          break;
        case "inspection":
          resource = await prisma.inspections.findFirst({
            where: { id: resourceId, orgId },
          });
          break;
      }

      if (!resource) {
        return Response.json({ error: "Resource not found" }, { status: 404 });
      }

      return await handler(req);
    } catch (error) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }
  };
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: Role): string {
  const roleNames = {
    ADMIN: "Administrator",
    MANAGER: "Manager",
    PM: "Project Manager",
    INSPECTOR: "Inspector",
    BILLING: "Billing",
    VENDOR: "Vendor",
    USER: "User",
  };

  return roleNames[role] || role;
}

/**
 * Get all available roles for admin users
 */
export function getAllRoles(): { value: Role; label: string }[] {
  return Object.entries(ROLE_PERMISSIONS).map(([role, _]) => ({
    value: role as Role,
    label: getRoleDisplayName(role as Role),
  }));
}
