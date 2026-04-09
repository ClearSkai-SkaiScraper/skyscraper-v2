/**
 * ============================================================================
 * UNIFIED ORG CONTEXT HELPER
 * ============================================================================
 *
 * THE SINGLE SOURCE OF TRUTH for orgId resolution in API routes.
 *
 * Uses the same canonical logic as resolveOrg:
 *   1. Find oldest valid membership (user_organizations + Org exists)
 *   2. Throw if none found (API routes should NOT auto-create orgs)
 *
 * For pages/layouts that need auto-creation, use ensureOrgForUser instead.
 * ============================================================================
 */

/* eslint-disable no-restricted-imports */
import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";

export interface UserOrgContext {
  userId: string;
  orgId: string;
  role: string;
  organizationName: string;
  isNewOrg: boolean;
}

/**
 * Ensure user has valid org context — canonical API route helper.
 *
 * @param forceUserId - Optional userId override (for server components)
 * @returns UserOrgContext with guaranteed valid orgId
 * @throws Error if user is not authenticated or has no org
 */
export async function ensureUserOrgContext(forceUserId?: string): Promise<UserOrgContext> {
  let userId: string | null = forceUserId || null;

  if (!userId) {
    const { userId: authUserId } = await auth();
    userId = authUserId;
  }

  if (!userId) {
    throw new Error("[ensureUserOrgContext] User not authenticated");
  }

  // Canonical lookup: oldest valid membership (matches resolveOrg logic)
  const memberships = await prisma.user_organizations.findMany({
    where: { userId },
    include: { Org: true },
    orderBy: { createdAt: "asc" },
  });

  const valid = memberships.find((m) => m.organizationId && m.Org);

  if (!valid?.Org) {
    throw new Error(
      `[ensureUserOrgContext] User ${userId} has no valid org membership (${memberships.length} total, 0 valid)`
    );
  }

  return {
    userId,
    orgId: valid.organizationId,
    role: valid.role || "MEMBER",
    organizationName: valid.Org.name || "My Organization",
    isNewOrg: false,
  };
}

/**
 * Get org context without auto-creating (read-only check)
 */
export async function getUserOrgContextReadOnly(userId: string): Promise<UserOrgContext | null> {
  const membership = await prisma.user_organizations.findFirst({
    where: { userId },
    include: { Org: true },
    orderBy: { createdAt: "asc" },
  });

  if (!membership?.Org) {
    return null;
  }

  return {
    userId,
    orgId: membership.organizationId,
    role: membership.role || "MEMBER",
    organizationName: membership.Org.name || "My Organization",
    isNewOrg: false,
  };
}

/**
 * Get orgId quickly (throws if none exists)
 */
export async function requireOrgId(userId?: string): Promise<string> {
  const ctx = await ensureUserOrgContext(userId);
  return ctx.orgId;
}
