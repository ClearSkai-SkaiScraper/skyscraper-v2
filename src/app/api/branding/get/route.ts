export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";

/**
 * GET /api/branding/get
 *
 * Fetches organization branding for authenticated user's org
 * Auto-creates org if user doesn't have one yet
 */
export async function GET(req: NextRequest) {
  try {
    const orgCtx = await getActiveOrgContext({ required: true });
    if (!orgCtx.ok) {
      return NextResponse.json({
        companyName: null,
        license: null,
        phone: null,
        email: null,
        website: null,
        colorPrimary: "#117CFF",
        colorAccent: "#FFC838",
        logoUrl: null,
        teamPhotoUrl: null,
      });
    }

    const orgIdCandidates = [orgCtx.orgId, orgCtx.clerkOrgId].filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );

    // Fetch branding from database
    const branding = await prisma.org_branding.findFirst({
      where: { orgId: { in: orgIdCandidates } },
      select: {
        companyName: true,
        license: true,
        phone: true,
        email: true,
        website: true,
        colorPrimary: true,
        colorAccent: true,
        logoUrl: true,
        teamPhotoUrl: true,
      },
    });

    if (!branding) {
      // Return default values if no branding configured
      return NextResponse.json({
        companyName: null,
        license: null,
        phone: null,
        email: null,
        website: null,
        colorPrimary: "#117CFF",
        colorAccent: "#FFC838",
        logoUrl: null,
        teamPhotoUrl: null,
      });
    }

    return NextResponse.json(branding);
  } catch (error) {
    logger.error("[branding/get] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
