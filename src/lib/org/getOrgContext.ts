"use server";

import "server-only";

import { redirect } from "next/navigation";

import { ensureOrgForUser } from "@/lib/org/ensureOrgForUser";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

type OrgContext = {
  orgId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  org: any;
  userId: string;
  isDemo: boolean;
};

/**
 * Canonical org resolver for server-only usage.
 *
 * Guarantees either:
 * - a valid org context ({ orgId, org, userId, isDemo }), or
 * - a redirect to sign-in when unauthenticated.
 *
 * IMPORTANT: This is self-healing. If an authenticated user has no
 * org membership, we auto-create/attach an org via ensureOrgForUser
 * instead of bouncing them back into onboarding loops.
 *
 * This should be the only entry point for pages/server actions
 * that require an organization.
 */
export async function getOrgContext(): Promise<OrgContext> {
  const ctx = await safeOrgContext();

  // Unauthenticated users should be sent to sign-in.
  if (ctx.status === "unauthenticated" || !ctx.userId) {
    redirect("/sign-in");
  }

  let orgId = ctx.orgId;

  // If we failed to establish an org membership, check WHY before auto-creating.
  // CRITICAL: If the user has a pending invitation, do NOT create a phantom org.
  if (ctx.status !== "ok" || !orgId) {
    if (ctx.reason === "pending-invitation") {
      // User has a pending invite — redirect to dashboard where the
      // invite banner will guide them to accept it.
      redirect("/dashboard");
    }
    const ensured = await ensureOrgForUser();
    orgId = ensured.orgId;
  }

  // Load the org row to return full org data.
  // Use try/catch to handle columns that exist in Prisma schema but
  // haven't been migrated to the production DB yet (e.g. seats_limit, seats_used).
  let org;
  try {
    org = await prisma.org.findUnique({
      where: { id: orgId },
    });
  } catch (err: unknown) {
    // If the query fails due to missing columns (P2022), retry with safe select
    const isColumnError =
      err instanceof Error &&
      (err.message?.includes("does not exist") || (err as { code?: string }).code === "P2022");
    if (isColumnError) {
      org = await prisma.org.findUnique({
        where: { id: orgId },
        select: {
          id: true,
          clerkOrgId: true,
          name: true,
          planId: true,
          createdAt: true,
          updatedAt: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          trialStatus: true,
          planKey: true,
          referralCode: true,
          brandLogoUrl: true,
          pdfFooterText: true,
          pdfHeaderText: true,
          demoMode: true,
          is_archived: true,
          onboarding_step: true,
          onboarding_complete: true,
        },
      });
    } else {
      throw err;
    }
  }

  // If the org row is somehow missing, bubble up as a hard error so we don't loop onboarding.
  if (!org) {
    throw new Error("Organization record not found for resolved orgId");
  }

  // Mark demo orgs based on configured demo IDs, if present.
  // eslint-disable-next-line no-restricted-syntax
  const demoOrgIds = [process.env.DEMO_ORG_ID, process.env.BETA_DEMO_ORG_ID].filter(
    Boolean
  ) as string[];

  const isDemo = demoOrgIds.includes(org.id);

  return {
    orgId: org.id,
    org,
    userId: ctx.userId!,
    isDemo,
  };
}
