import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Prisma singleton imported from @/lib/db/prisma

export interface UserPlanAndTokens {
  plan: string;
  subscriptionStatus: string;
  canAccessFeature: (feature: string) => boolean;
}

export async function getUserPlanAndTokens(userId?: string): Promise<UserPlanAndTokens> {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId: authUserId, orgId } = await auth();
  const targetUserId = userId || authUserId;

  if (!targetUserId) {
    return {
      plan: "free",
      subscriptionStatus: "inactive",
      canAccessFeature: () => false,
    };
  }

  try {
    // Get user's organization
    const org = await prisma.org.findFirst({
      where: {
        clerkOrgId: orgId || "",
      },
      include: {
        Plan: true,
        Subscription: true,
      },
    });

    if (!org) {
      return {
        plan: "free",
        subscriptionStatus: "inactive",
        canAccessFeature: (feature: string) => feature === "demo",
      };
    }

    const plan = org.Plan?.slug || "free";
    const subscriptionStatus = org.Subscription?.status || "inactive";

    return {
      plan,
      subscriptionStatus,
      canAccessFeature: (feature: string) => {
        if (feature === "demo") return true;
        if (subscriptionStatus !== "active") return false;

        const planFeatures = {
          free: ["demo"],
          solo: ["demo", "basic-reports", "ai-analysis"],
          business: ["demo", "basic-reports", "ai-analysis", "advanced-reports", "integrations"],
          enterprise: [
            "demo",
            "basic-reports",
            "ai-analysis",
            "advanced-reports",
            "integrations",
            "custom-branding",
            "api-access",
          ],
        };

        return planFeatures[plan as keyof typeof planFeatures]?.includes(feature) || false;
      },
    };
  } catch (error) {
    logger.error("Error getting user plan:", error);
    return {
      plan: "free",
      subscriptionStatus: "error",
      canAccessFeature: () => false,
    };
  }
}

/**
 * @deprecated Token system removed — flat $80/month plan includes all features
 */
export async function consumeTokens(
  _count: number = 1,
  _orgId?: string
): Promise<{ success: boolean; remainingTokens: number }> {
  return { success: true, remainingTokens: 999999 };
}

// Server-side function to check subscription access
export async function requireTokens(_requiredTokens: number = 1, requiredFeature?: string) {
  const userPlan = await getUserPlanAndTokens();

  if (requiredFeature && !userPlan.canAccessFeature(requiredFeature)) {
    redirect("/pricing?feature=" + encodeURIComponent(requiredFeature));
  }

  return {
    ...userPlan,
    hasTokens: () => true,
    tokensRemaining: 999999,
  };
}

// Check subscription status for feature access
export async function requireSubscription(feature?: string) {
  const userPlan = await getUserPlanAndTokens();

  if (userPlan.subscriptionStatus !== "active") {
    redirect("/pricing?required=subscription");
  }

  if (feature && !userPlan.canAccessFeature(feature)) {
    redirect("/pricing?feature=" + encodeURIComponent(feature));
  }

  return userPlan;
}
