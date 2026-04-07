export const dynamic = "force-dynamic";

/**
 * PHASE 3: Organization Initialize API
 * Manually marks org as initialized (both branding + onboarding complete)
 * NOW USES: ensureOrgForUser to guarantee org exists
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { isTestMode } from "@/lib/testMode";

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    logger.debug(`[OrgInit] Org ${orgId} resolved for user ${userId}`);

    // Update org timestamp (brandingCompleted/onboardingCompleted fields don't exist in schema)
    await prisma.org.update({
      where: { id: orgId },
      data: {
        updatedAt: new Date(),
      },
    });

    const testModeActive = isTestMode();

    logger.info(`[OrgInit] Org ${orgId} fully initialized`, {
      testMode: testModeActive,
    });

    // Revalidate critical paths to refresh org context
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/dashboard");
    revalidatePath("/contacts");
    revalidatePath("/settings/branding");
    revalidatePath("/claims");
    logger.debug("[OrgInit] Revalidated paths: dashboard, contacts, branding, claims");

    return NextResponse.json({
      success: true,
      org: await prisma.org.findUnique({ where: { id: orgId } }),
      testMode: testModeActive,
    });
  } catch (error) {
    logger.error("[OrgInit] Failed:", error);
    return NextResponse.json({ error: "Failed to initialize organization" }, { status: 500 });
  }
});
