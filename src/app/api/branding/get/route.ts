export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

/**
 * GET /api/branding/get
 *
 * Fetches organization branding for authenticated user's org.
 * Uses safeOrgContext (DB-first) to ensure consistent orgId resolution
 * — this was previously using getActiveOrgContext which caused branding
 * to "disappear" due to orgId mismatch between save and read.
 */
export async function GET(req: NextRequest) {
  try {
    const orgCtx = await safeOrgContext();
    if (!orgCtx.ok || !orgCtx.orgId) {
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

    // Look up the org to get clerkOrgId for backward-compatible dual-ID lookup
    const org = await prisma.org.findUnique({
      where: { id: orgCtx.orgId },
      select: { clerkOrgId: true },
    });

    const orgIdCandidates = [orgCtx.orgId, org?.clerkOrgId].filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );

    // Fetch branding from database — use orderBy to always get the most recent
    // (handles case where legacy Clerk orgId record + new DB UUID record coexist)
    const branding = await prisma.org_branding.findFirst({
      where: { orgId: { in: orgIdCandidates } },
      orderBy: { updatedAt: "desc" },
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
