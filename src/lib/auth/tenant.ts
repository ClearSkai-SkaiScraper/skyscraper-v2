/**
 * Multi-Tenant Session Resolution
 * This is the MOST IMPORTANT utility for SaaS data isolation
 */

import { auth } from "@clerk/nextjs/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Retry helper for database operations with exponential backoff
 * Handles ECONNRESET and other transient network errors in serverless
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 100
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Retry on connection errors
      const isRetryable =
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ENOTFOUND" ||
        error.message?.includes("Connection terminated") ||
        error.message?.includes("Connection closed");

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.log(
        `⚠️ [Retry ${attempt}/${maxRetries}] Network error (${error.code}), retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Get the current user's organization ID from UserOrganization table
 * This MUST be used in every API route that accesses tenant data
 *
 * @returns orgId or null if user not authenticated
 */
export async function getTenant(): Promise<string | null> {
  // BUILD-TIME BYPASS: Return null during Next.js build/export to prevent crashes
  // This check ensures the tenant isolation logic doesn't run during static generation
  if (
    process.env.NEXT_PHASE === "phase-export" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    logger.debug("[getTenant] BUILD-TIME: Skipping tenant check during build/export phase");
    return null;
  }

  try {
    const { userId } = await auth();

    logger.debug("[getTenant] Clerk userId:", userId);

    if (!userId) {
      logger.debug("[getTenant] No userId from Clerk - user not authenticated");
      return null;
    }

    // Get user's organization from UserOrganization junction table (WITH RETRY)
    let membership = await retryWithBackoff(async () => {
      return await prisma.user_organizations.findFirst({
        where: { userId: userId },
        select: { organizationId: true },
        orderBy: { createdAt: "asc" },
      });
    });

    logger.debug("[getTenant] UserOrganization membership:", membership);

    if (!membership) {
      // Fallback: check legacy users table direct Org linkage
      const legacyUser = await prisma.users.findUnique({
        where: { clerkUserId: userId },
        select: { orgId: true },
      });
      if (legacyUser?.orgId) {
        logger.warn("[getTenant] Fallback activated: using users.orgId (no UserOrganization row)");
        return legacyUser.orgId;
      }

      // Fallback 2: check tradesCompanyMember for trades-only users
      const tradeMember = await retryWithBackoff(async () => {
        return await prisma.tradesCompanyMember.findFirst({
          where: { userId },
          select: { orgId: true, companyId: true },
        });
      });
      if (tradeMember?.orgId || tradeMember?.companyId) {
        // Prefer orgId — companyId is a trades-specific UUID that may not match an Org row
        const resolvedId = tradeMember.orgId || null;
        if (resolvedId) {
          logger.warn("[getTenant] Fallback 2: using tradesCompanyMember orgId:", resolvedId);
          return resolvedId;
        }
        // If only companyId exists, verify it maps to a real Org before returning
        if (tradeMember.companyId) {
          const orgCheck = await prisma.org.findUnique({
            where: { id: tradeMember.companyId },
            select: { id: true },
          });
          if (orgCheck) {
            console.warn(
              "[getTenant] Fallback 2: using tradesCompanyMember companyId as orgId:",
              tradeMember.companyId
            );
            return tradeMember.companyId;
          }
        }
      }
    }

    // OPTIONAL AUTO-CREATE ORG (legacy support) gated behind env flag AUTO_CREATE_TENANT=1
    if (!membership && process.env.AUTO_CREATE_TENANT === "1") {
      console.log(
        "[getTenant] No Org membership found - AUTO-CREATING (flag enabled) for userId:",
        userId
      );
      try {
        const orgData = {
          id: `org_${userId}`,
          clerkOrgId: `org_${userId}`,
          name: `My Company`,
          updatedAt: new Date(),
        };
        const Org = await retryWithBackoff(async () =>
          prisma.org.upsert({
            where: { clerkOrgId: orgData.clerkOrgId },
            update: {},
            create: orgData,
          })
        );
        const junctionData = {
          id: `uo_${Org.id}_${userId}`,
          userId: userId,
          organizationId: Org.id,
          role: "owner",
        };
        membership = await retryWithBackoff(async () =>
          prisma.user_organizations.create({
            data: junctionData,
            select: { organizationId: true },
          })
        );
        logger.debug("[getTenant] AUTO-CREATED Org:", Org.id);
      } catch (createError: any) {
        console.error(
          "🚨 ORG CREATION FAILURE (auto-create disabled or failed):",
          createError.message
        );
      }
    } else if (!membership) {
      // Return null without auto-provisioning; onboarding flow will handle initialization
      console.log(
        "[getTenant] No membership (and no users.orgId fallback) and auto-create flag not set; returning null"
      );
      return null;
    }

    // 🔧 FIX: Use organizationId with comprehensive fallback for all field name variations
    const orgId = membership?.organizationId ?? (membership as any)?.organization_id ?? null;
    logger.debug("[getTenant] Returning orgId:", orgId);

    if (!orgId) {
      logger.warn("[getTenant] No orgId found in membership object:", membership);
    }

    return orgId;
  } catch (error) {
    logger.error("[getTenant] ERROR:", error);
    return null;
  }
}

/**
 * Alias for getTenant - matches your naming convention
 */
export async function getTenantOrgId(): Promise<string | null> {
  return getTenant();
}

/**
 * Get the current user's organization ID or throw error
 * Use this when tenant is REQUIRED (most API routes)
 */
export async function requireTenant(): Promise<string> {
  // BUILD-TIME BYPASS: Return placeholder during Next.js build/export to prevent crashes
  if (
    process.env.NEXT_PHASE === "phase-export" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    logger.debug("[requireTenant] BUILD-TIME: Returning placeholder during build/export phase");
    return "build-time-placeholder";
  }

  const orgId = await getTenant();

  if (!orgId) {
    throw new Error("User not associated with an organization. Please contact support.");
  }

  return orgId;
}

/**
 * Get full tenant context (orgId + userId + user details)
 * Use this when you need both user and Org information
 */
export async function getTenantContext() {
  // BUILD-TIME BYPASS: Return null during Next.js build/export to prevent crashes
  if (
    process.env.NEXT_PHASE === "phase-export" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    logger.debug("[getTenantContext] BUILD-TIME: Skipping during build/export phase");
    return null;
  }

  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await prisma.users.findUnique({
    where: { clerkUserId: userId },
    include: {
      Org: {
        select: {
          id: true,
          name: true,
          planId: true,
          subscriptionStatus: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    clerkUserId: userId,
    orgId: user.orgId,
    Org: user.Org,
    user,
  };
}

/**
 * Verify user has access to a specific organization
 * Use this when accepting orgId from client
 */
export async function verifyTenantAccess(orgId: string): Promise<boolean> {
  const userOrgId = await getTenant();
  return userOrgId === orgId;
}

/**
 * Validate that a record belongs to the current tenant
 * Throws error if access denied
 */
export async function validateTenantAccess(recordOrgId: string | null | undefined): Promise<void> {
  // BUILD-TIME BYPASS: Skip validation during Next.js build/export to prevent crashes
  if (
    process.env.NEXT_PHASE === "phase-export" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    logger.debug("[validateTenantAccess] BUILD-TIME: Skipping during build/export phase");
    return;
  }

  const currentOrgId = await getTenant();

  if (!currentOrgId) {
    throw new Error("No tenant context");
  }

  if (recordOrgId !== currentOrgId) {
    throw new Error("Access denied - Record belongs to different organization");
  }
}

/**
 * Get organization details for current user
 */
export async function getOrganization() {
  const orgId = await getTenant();

  if (!orgId) {
    return null;
  }

  return await prisma.org.findUnique({
    where: { id: orgId },
    include: {
      Plan: true,
      // TokenWallet: true, // removed — model does not exist in Prisma schema
      Subscription: true,
    },
  });
}

/**
 * withOrgScope - API route wrapper with automatic tenant context
 *
 * Usage (basic):
 * export const GET = withOrgScope(async (req, { userId, orgId }) => {
 *   const claims = await prisma.claims.findMany({ where: { orgId } });
 *   return NextResponse.json({ claims });
 * });
 *
 * Usage (with params):
 * export const GET = withOrgScope(async (req, { userId, orgId }, context) => {
 *   const claim = await prisma.claims.findFirst({
 *     where: { id: context.params.id, orgId }
 *   });
 *   return NextResponse.json({ claim });
 * });
 */
import { NextResponse } from "next/server";

export function withOrgScope<
  T extends (
    req: Request,
    context: { userId: string; orgId: string },
    ...args: any[]
  ) => Promise<Response>,
>(handler: T) {
  return async (req: Request, ...args: any[]) => {
    try {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }

      const orgId = await requireTenant();
      return await handler(req, { userId, orgId }, ...args);
    } catch (error: any) {
      logger.error("[ORG SCOPE ERROR]", error);
      // Classify: auth errors → 401, everything else → 500
      const isAuthError =
        error.message?.includes("Unauthorized") ||
        error.message?.includes("No active tenant") ||
        error.message?.includes("No org membership");
      const status = isAuthError ? 401 : 500;
      const safeMessage = isAuthError ? "Unauthorized" : "Internal server error";
      return NextResponse.json({ ok: false, error: safeMessage }, { status });
    }
  };
}

// Re-export from the new location for backwards compatibility
export { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
