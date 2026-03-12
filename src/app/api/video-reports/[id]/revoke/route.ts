export const dynamic = "force-dynamic";

/**
 * 🔥 PHASE 27.2a: REVOKE VIDEO SHARE
 *
 * POST /api/video-reports/[id]/revoke
 * Revokes public access to video report
 */

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

// Prisma singleton imported from @/lib/db/prisma

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const Org = await prisma.org.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!Org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const reportId = params.id;

    // Verify report exists and belongs to Org (orgId in WHERE prevents IDOR/enumeration)
    const report = await prisma.ai_reports.findFirst({
      where: { id: reportId, orgId: Org.id },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Revoke public access — org-scoped for defense-in-depth
    await prisma.ai_reports.updateMany({
      where: { id: reportId, orgId: Org.id },
      data: {
        status: "revoked",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Share link revoked",
    });
  } catch (error) {
    logger.error("Error revoking video share:", error);
    return NextResponse.json(
      { error: "Failed to revoke share link", details: "Internal server error" },
      { status: 500 }
    );
  }
}
