/**
 * Tenant Isolation Middleware
 *
 * Automatically enforces multi-tenant data isolation across all API routes.
 * This prevents cross-organization data leakage.
 */

import { NextRequest, NextResponse } from "next/server";

import { getTenant } from "./tenant";

/**
 * Middleware wrapper that ensures tenant context is available
 * Use this to wrap API route handlers
 */
export function withTenant(handler: (req: NextRequest, orgId: string) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const orgId = await getTenant();

    if (!orgId) {
      return NextResponse.json(
        { error: "Unauthorized - No organization context" },
        { status: 401 }
      );
    }

    return handler(req, orgId);
  };
}

/**
 * Helper to add tenant filter to Prisma queries
 *
 * Usage:
 * const claims = await prisma.claims.findMany(
 *   withTenantFilter({ status: "active" })
 * );
 */
export async function withTenantFilter<T extends Record<string, unknown>>(
  where: T = {} as T
): Promise<T & { orgId: string }> {
  const orgId = await getTenant();

  if (!orgId) {
    throw new Error("No tenant context available");
  }

  return {
    ...where,
    orgId,
  };
}

/**
 * Validate that a record belongs to the current tenant
 * Throws error if access denied
 */
export async function validateTenantAccess(recordOrgId: string | null | undefined): Promise<void> {
  const currentOrgId = await getTenant();

  if (!currentOrgId) {
    throw new Error("No tenant context");
  }

  if (recordOrgId !== currentOrgId) {
    throw new Error("Access denied - Record belongs to different organization");
  }
}

/**
 * Get tenant-scoped Prisma where clause
 *
 * Usage:
 * const where = await getTenantWhere({ status: "active" });
 * const claims = await prisma.claims.findMany({ where });
 */
export async function getTenantWhere<T extends Record<string, unknown>>(
  additionalFilters: T = {} as T
): Promise<T & { orgId: string }> {
  const orgId = await getTenant();

  if (!orgId) {
    throw new Error("No organization context found");
  }

  return {
    ...additionalFilters,
    orgId,
  };
}
