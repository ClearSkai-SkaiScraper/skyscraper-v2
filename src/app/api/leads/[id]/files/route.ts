export const dynamic = "force-dynamic";

/**
 * GET /api/leads/[id]/files
 *
 * Get files for a lead/job
 */

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const Org = await prisma.org.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!Org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const leadId = params.id;

    // Verify lead belongs to org
    const lead = await prisma.leads.findFirst({
      where: { id: leadId, orgId: Org.id },
      select: { id: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Get files for this lead using dynamic model access
    const files = await prisma.file_assets.findMany({
      where: {
        orgId: Org.id,
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
}
