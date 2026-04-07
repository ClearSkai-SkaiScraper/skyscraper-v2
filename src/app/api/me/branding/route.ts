export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    // Fetch organization branding from database
    const branding = await prisma.org_branding.findFirst({
      where: { orgId },
      select: {
        colorPrimary: true,
        colorAccent: true,
        logoUrl: true,
        companyName: true,
      },
    });

    if (!branding) {
      return NextResponse.json({
        complete: false,
        primary: "#117CFF",
        accent: "#00D1FF",
        surface: null,
        text: null,
        logoUrl: null,
      });
    }

    return NextResponse.json({
      complete: true,
      primary: branding.colorPrimary || "#117CFF",
      accent: branding.colorAccent || "#00D1FF",
      surface: null,
      text: null,
      logoUrl: branding.logoUrl || null,
      companyName: branding.companyName || null,
    });
  } catch (error) {
    logger.error("[ME_BRANDING]", { error });
    return NextResponse.json({ complete: false, error: "Internal server error" }, { status: 500 });
  }
});
