import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { isBetaMode } from "@/lib/beta";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { isPlatformAdmin } from "@/lib/security/roles";

export const dynamic = "force-dynamic";

// Calculate storage used by organization (in bytes)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function calculateStorageUsed(orgId: string): Promise<number> {
  // Storage tracking not yet implemented - org_branding doesn't have size field
  // Return 0 for now - future: add file size tracking to uploads
  return 0;
}

/**
 * GET /api/billing/status
 * Returns current user's billing status including:
 * - Plan tier
 * - Usage limits (claims, storage)
 * - Whether account is limited
 * NOTE: Token/credit system removed — flat $80/month pricing
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    // ADMIN MODE: Platform admins get unlimited forever free access
    try {
      const isAdmin = await isPlatformAdmin();
      if (isAdmin) {
        logger.debug("[BILLING STATUS] Platform admin - returning unlimited status");
        return NextResponse.json({
          plan: "Admin (Forever Free)",
          planTier: "enterprise",
          isLimited: false,
          isAdmin: true,
          claimsRemaining: 999999,
          claimsUsed: 0,
          claimsLimit: 999999,
          storageUsed: 0,
          storageLimit: 1024 * 1024 * 1024 * 500, // 500GB
        });
      }
    } catch (adminError) {
      logger.warn("[BILLING STATUS] Admin check failed:", adminError);
    }

    // BETA MODE: Return unlimited access
    if (isBetaMode()) {
      logger.debug("[BILLING STATUS] Beta mode active - returning unlimited status");
      return NextResponse.json({
        plan: "Beta Access",
        planTier: "enterprise",
        isLimited: false,
        claimsRemaining: 999999,
        claimsUsed: 0,
        claimsLimit: 999999,
        storageUsed: 0,
        storageLimit: 1024 * 1024 * 1024 * 500, // 500GB
      });
    }

    // Get organization — orgId from withAuth is already the DB UUID
    const org = await prisma.org.findFirst({
      where: { id: orgId },
      include: {
        Plan: true,
      },
    });

    if (!org) {
      // Return default free tier
      return NextResponse.json({
        plan: "Free",
        planTier: "free",
        isLimited: true,
        claimsRemaining: 3,
        claimsUsed: 0,
        claimsLimit: 3,
        storageUsed: 0,
        storageLimit: 1024 * 1024 * 100, // 100MB
      });
    }

    // Get claims count for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const claimsCount = await prisma.claims.count({
      where: {
        orgId: org.id,
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Determine plan limits
    const planTier = org.planKey || "free";
    const limits = getPlanLimits(planTier);

    // Flat $80/month — limited only if over claims limit
    const isLimited = claimsCount >= limits.claimsLimit;

    return NextResponse.json({
      plan: org.Plan?.name || "Free",
      planTier,
      isLimited,
      claimsRemaining: Math.max(0, limits.claimsLimit - claimsCount),
      claimsUsed: claimsCount,
      claimsLimit: limits.claimsLimit,
      storageUsed: await calculateStorageUsed(org.id),
      storageLimit: limits.storageLimit,
    });
  } catch (error) {
    logger.error("Billing status error:", error);
    return NextResponse.json({ error: "Failed to fetch billing status" }, { status: 500 });
  }
});

function getPlanLimits(planKey: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const limits: Record<string, any> = {
    free: {
      claimsLimit: 3,
      storageLimit: 1024 * 1024 * 100, // 100MB
    },
    solo: {
      claimsLimit: 50,
      storageLimit: 1024 * 1024 * 1024 * 5, // 5GB
    },
    solo_plus: {
      claimsLimit: 999999,
      storageLimit: 1024 * 1024 * 1024 * 50, // 50GB
    },
    business: {
      claimsLimit: 500,
      storageLimit: 1024 * 1024 * 1024 * 50, // 50GB
    },
    enterprise: {
      claimsLimit: 999999,
      storageLimit: 1024 * 1024 * 1024 * 500, // 500GB
    },
  };

  return limits[planKey] || limits.free;
}
