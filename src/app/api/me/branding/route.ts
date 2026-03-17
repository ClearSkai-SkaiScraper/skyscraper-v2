export const dynamic = "force-dynamic";
export const revalidate = 0;
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ complete: false, error: "Unauthorized" }, { status: 401 });
    }

    const orgCtx = await getActiveOrgContext({ required: true });
    if (!orgCtx.ok) {
      return NextResponse.json({ complete: false, error: "No organization" }, { status: 400 });
    }

    const orgIdCandidates = [orgCtx.orgId, orgCtx.clerkOrgId].filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );

    // Database is always available now

    // Fetch organization branding from database
    const branding = await prisma.org_branding.findFirst({
      where: { orgId: { in: orgIdCandidates } },
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
    logger.error("Error fetching branding:", error);
    return NextResponse.json({ complete: false, error: "Internal server error" }, { status: 500 });
  }
}
