import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getActiveOrgSafe } from "@/lib/auth/getActiveOrgSafe";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();

    if (!userId) {
      // 401 is correct for unauthenticated
      return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
    }

    // Use getActiveOrgSafe with auto-create enabled
    const orgResult = await getActiveOrgSafe({ allowAutoCreate: true });

    if (!orgResult.ok) {
      // Return 200 with ok: false - NOT 401 or 503
      // This lets the client distinguish auth failure from missing org
      return NextResponse.json({
        ok: false,
        reason: orgResult.reason,
        error: orgResult.error || "Organization not available",
      });
    }

    // Fetch the actual demoMode value from the org (with fallback if column doesn't exist)
    let demoModeValue = true; // Default to true
    try {
      const orgDetails = await prisma.org.findUnique({
        where: { id: orgResult.org.id },
        select: { demoMode: true },
      });
      demoModeValue = orgDetails?.demoMode ?? true;
    } catch (error) {
      logger.warn("[/api/org/active] demoMode query failed (column may not exist):", error);
      // Continue with default value
    }

    return NextResponse.json({
      ok: true,
      orgId: orgResult.org.id,
      name: orgResult.org.name,
      clerkOrgId: orgResult.org.clerkOrgId,
      role: "ADMIN",
      demoMode: demoModeValue,
      source: orgResult.source,
    });
  } catch (e) {
    logger.error("[/api/org/active] Error:", e);
    return NextResponse.json({ ok: false, reason: "error", error: "Internal server error" }, { status: 500 });
  }
}
