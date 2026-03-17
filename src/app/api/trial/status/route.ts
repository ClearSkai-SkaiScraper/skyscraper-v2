export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getTrialInfo } from "@/lib/billing/trials";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get orgId from query or auth
    const searchParams = request.nextUrl.searchParams;
    const requestedOrgId = searchParams.get("orgId") || orgId;

    if (!requestedOrgId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    // Fetch Org with trial info
    const Org = await prisma.org.findUnique({
      where: { id: requestedOrgId },
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
}
