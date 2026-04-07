export const dynamic = "force-dynamic";

/**
 * GET /api/leads/[id]/files
 *
 * Get files for a lead/job
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, { orgId }, routeParams) => {
  try {
    const { id: leadId } = await routeParams.params;

    // Verify lead belongs to org
    const lead = await prisma.leads.findFirst({
      where: { id: leadId, orgId },
      select: { id: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Get files for this lead using dynamic model access
    const files = await prisma.file_assets.findMany({
      where: {
        orgId,
        leadId: leadId,
      },
      orderBy: { createdAt: "desc" },
    });

    // Detect shared status from note prefix (temporary until schema field added)
    const sharePrefix = "[SHARED]";
    const filesWithSharing = files.map((f) => ({
      ...f,
      sharedWithClient: (f.note || "").startsWith(sharePrefix),
    }));

    return NextResponse.json({ files: filesWithSharing });
  } catch (error) {
    logger.error("[Leads Files GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
