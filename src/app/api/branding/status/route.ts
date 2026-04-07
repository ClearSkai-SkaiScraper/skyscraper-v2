import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    // Check if organization branding exists and is complete
    const orgBranding = await prisma.org_branding.findFirst({
      where: {
        orgId,
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
});
