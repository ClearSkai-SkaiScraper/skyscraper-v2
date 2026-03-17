import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user: Record<string, unknown> | null = null;

    if (!user) {
      user = await prisma.users.findUnique({
        where: { clerkUserId: userId },
        include: { Org: true },
      });
    }

    if (!user || !user.orgId) {
      return NextResponse.json({
        isComplete: false,
        description: "No organization found",
      });
    }

    const userOrgId = user.orgId as string;

    // Check if organization branding exists and is complete
    const orgBranding = await prisma.org_branding.findFirst({
      where: {
        orgId: userOrgId,
      },
    });

    // Define what constitutes "complete" branding
    const isComplete =
      orgBranding && orgBranding.companyName && orgBranding.colorPrimary && orgBranding.email;

    return NextResponse.json({
      isComplete: !!isComplete,
      branding: orgBranding,
      requirements: {
        companyName: !!orgBranding?.companyName,
        email: !!orgBranding?.email,
        colors: !!orgBranding?.colorPrimary,
        logo: !!orgBranding?.logoUrl,
      },
    });
  } catch (error) {
    logger.error("Error checking branding status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
