export const dynamic = "force-dynamic";

/**
 * 🔥 PHASE 27.2a: REVOKE VIDEO SHARE
 *
 * POST /api/video-reports/[id]/revoke
 * Revokes public access to video report
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (req: NextRequest, { orgId }, routeParams) => {
  try {
    const { id: reportId } = await routeParams.params;

    // Verify report exists and belongs to Org (orgId in WHERE prevents IDOR/enumeration)
    const report = await prisma.ai_reports.findFirst({
      where: { id: reportId, orgId },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Revoke public access — org-scoped for defense-in-depth
    await prisma.ai_reports.updateMany({
      where: { id: reportId, orgId },
      data: {
        status: "revoked",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Share link revoked",
    });
  } catch (err: unknown) {
    logger.error("Error revoking video share:", err);
    return NextResponse.json(
      {
        error: "Failed to revoke share link",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});
