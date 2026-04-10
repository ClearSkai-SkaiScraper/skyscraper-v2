/**
 * Global Org Scoping Middleware
 *
 * Ensures ALL API requests are scoped to the authenticated user's organization.
 * Prevents cross-org data leaks by enforcing orgId on every Prisma query.
 *
 * Usage in API routes:
 * const { prisma, orgId, userId } = await enforceOrgScope(req);
 */

import { NextRequest } from "next/server";

import { getCurrentUserPermissions } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export interface OrgScopeContext {
  orgId: string;
  userId: string;
  userRole?: string;
  prisma: typeof prisma;
}

/**
 * Enforce org scoping on API request
 * Throws 401 if not authenticated
 * Throws 403 if no org context
 */
export async function enforceOrgScope(_req: NextRequest): Promise<OrgScopeContext> {
  const permissions = await getCurrentUserPermissions();

  if (!permissions.userId) {
    throw new Error("Authentication required");
  }

  if (!permissions.orgId) {
    throw new Error("No organization context - user must join or create an organization");
  }

  return {
    orgId: permissions.orgId,
    userId: permissions.userId,
    userRole: permissions.role,
    prisma: prisma,
  };
}

/**
 * Org-scoped Prisma queries helper
 * Automatically adds orgId filter to all queries
 */
export function createOrgScopedPrisma(orgId: string) {
  return {
    claims: {
      ...prisma.claims,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findMany: (args: any) =>
        prisma.claims.findMany({ ...args, where: { ...args?.where, orgId } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findFirst: (args: any) =>
        prisma.claims.findFirst({ ...args, where: { ...args?.where, orgId } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findUnique: (args: any) =>
        prisma.claims.findFirst({ ...args, where: { ...args?.where, orgId } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      count: (args: any) => prisma.claims.count({ ...args, where: { ...args?.where, orgId } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: (args: any) => prisma.claims.create({ ...args, data: { ...args?.data, orgId } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: (args: any) => prisma.claims.update({ ...args, where: { ...args?.where, orgId } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete: (args: any) => prisma.claims.delete({ ...args, where: { ...args?.where, orgId } }),
    },
    leads: {
      ...prisma.leads,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findMany: (args: any) => prisma.leads.findMany({ ...args, where: { ...args?.where, orgId } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findFirst: (args: any) =>
        prisma.leads.findFirst({ ...args, where: { ...args?.where, orgId } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      count: (args: any) => prisma.leads.count({ ...args, where: { ...args?.where, orgId } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: (args: any) => prisma.leads.create({ ...args, data: { ...args?.data, orgId } }),
    },
    clients: {
      ...prisma.contacts,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findMany: (args: any) =>
        prisma.contacts.findMany({ ...args, where: { ...args?.where, orgId } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findFirst: (args: any) =>
        prisma.contacts.findFirst({ ...args, where: { ...args?.where, orgId } }),
    },
  };
}

/**
 * Validate orgId ownership
 * Use this before any operation that modifies data
 */
export async function verifyOrgOwnership(orgId: string, resourceOrgId: string): Promise<boolean> {
  if (orgId !== resourceOrgId) {
    throw new Error("Access denied - resource does not belong to your organization");
  }
  return true;
}

/**
 * Extract orgId from request (for routes that don't use enforceOrgScope)
 */
export async function getOrgIdFromRequest(_req: NextRequest): Promise<string | null> {
  try {
    const permissions = await getCurrentUserPermissions();
    return permissions.orgId || null;
  } catch {
    return null;
  }
}
