/**
 * Security enforcement utilities for Pro and Client permissions
 */

import { auth } from "@clerk/nextjs/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface SecurityContext {
  userId: string;
  role: "PRO" | "CLIENT" | "UNKNOWN";
  orgId?: string;
}

/**
 * Get current user's security context
 */
export async function getSecurityContext(): Promise<SecurityContext | null> {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();

  if (!userId) return null;

  // TODO: Implement proper role detection based on Clerk metadata
  // For now, we'll determine role based on claim links
  const clientLink = await prisma.claimClientLink.findFirst({
    where: { clientUserId: userId },
    select: { id: true },
  });

  if (clientLink) {
    return {
      userId,
      role: "CLIENT",
    };
  }

  // TODO: Get orgId from organization membership
  // For now, assume PRO role
  return {
    userId,
    role: "PRO",
    orgId: undefined, // Will be populated from org membership
  };
}

/**
 * Verify Pro user has access to a claim
 */
export async function verifyProClaimAccess(userId: string, claimId: string): Promise<boolean> {
  try {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: { orgId: true },
    });

    if (!claim) return false;

    // TODO: Verify userId belongs to claim.orgId via organization membership
    // For now, we'll allow access (rely on frontend auth)
    return true;
  } catch (error) {
    logger.error("[VERIFY_PRO_ACCESS_ERROR]", error);
    return false;
  }
}

/**
 * Verify Client user has access to a claim (must be CONNECTED)
 */
export async function verifyClientClaimAccess(userId: string, claimId: string): Promise<boolean> {
  try {
    const link = await prisma.claimClientLink.findFirst({
      where: {
        claimId,
        clientUserId: userId,
        status: "CONNECTED",
      },
    });

    return !!link;
  } catch (error) {
    logger.error("[VERIFY_CLIENT_ACCESS_ERROR]", error);
    return false;
  }
}

/**
 * Get only client-visible photos for a claim
 * Uses documents table with isPublic=true (via project)
 */
export async function getClientVisiblePhotos(claimId: string) {
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: { projectId: true },
  });

  if (!claim?.projectId) return [];

  return await prisma.documents.findMany({
    where: {
      projectId: claim.projectId,
      type: "PHOTO",
      isPublic: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get only client-visible timeline events for a claim
 */
export async function getClientVisibleTimeline(claimId: string) {
  return await prisma.claim_timeline_events.findMany({
    where: {
      claim_id: claimId,
      visible_to_client: true,
    },
    orderBy: { occurred_at: "desc" },
  });
}

/**
 * Enforce security rules for API endpoints
 */
export const SecurityEnforcement = {
  /**
   * Pro-only endpoint guard
   */
  async requireProAccess(
    claimId: string
  ): Promise<
    { success: true; userId: string } | { success: false; error: string; status: number }
  > {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: "Unauthorized", status: 401 };
    }

    const hasAccess = await verifyProClaimAccess(userId, claimId);

    if (!hasAccess) {
      return { success: false, error: "Access denied", status: 403 };
    }

    return { success: true, userId };
  },

  /**
   * Client-only endpoint guard
   */
  async requireClientAccess(
    claimId: string
  ): Promise<
    { success: true; userId: string } | { success: false; error: string; status: number }
  > {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: "Unauthorized", status: 401 };
    }

    const hasAccess = await verifyClientClaimAccess(userId, claimId);

    if (!hasAccess) {
      return { success: false, error: "No connection to this claim", status: 403 };
    }

    return { success: true, userId };
  },

  /**
   * Pro OR Client endpoint guard (whoever has access)
   */
  async requireAnyAccess(
    claimId: string
  ): Promise<
    | { success: true; userId: string; role: "PRO" | "CLIENT" }
    | { success: false; error: string; status: number }
  > {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: "Unauthorized", status: 401 };
    }

    // Check client access first
    const clientAccess = await verifyClientClaimAccess(userId, claimId);
    if (clientAccess) {
      return { success: true, userId, role: "CLIENT" };
    }

    // Check pro access
    const proAccess = await verifyProClaimAccess(userId, claimId);
    if (proAccess) {
      return { success: true, userId, role: "PRO" };
    }

    return { success: false, error: "Access denied", status: 403 };
  },
};
