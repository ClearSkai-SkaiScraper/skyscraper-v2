export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { getTrialInfo } from "@/lib/billing/trials";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    // Fetch Org with trial info
    const Org = await prisma.org.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        trialStartAt: true,
        trialEndsAt: true,
        trialStatus: true,
        subscriptionStatus: true,
      },
    });

    if (!Org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get trial info
    const trialInfo = getTrialInfo(Org);

    return NextResponse.json(trialInfo);
  } catch (error) {
    logger.error("Error fetching trial status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
