export const dynamic = "force-dynamic";

/**
 * PHASE 3: Organization Initialize API
 * Manually marks org as initialized (both branding + onboarding complete)
 * NOW USES: ensureOrgForUser to guarantee org exists
 */

import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { ensureOrgForUser } from "@/lib/org/ensureOrgForUser";
import prisma from "@/lib/prisma";
import { isTestMode } from "@/lib/testMode";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use ensureOrgForUser to guarantee org + membership exists
    const ensured = await ensureOrgForUser();
    const orgId = ensured.orgId;

    logger.debug(`[OrgInit] Org ${orgId} resolved for user ${user.id}`);

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
}
