export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// API: RETRY EXPORT JOB
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { orgId, userId } = auth;

    const jobId = params.id;

    // Get existing job — scoped to org
    const job = await prisma.export_jobs.findFirst({
      where: { id: jobId, org_id: orgId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Reset status to queued — scoped to org
    await prisma.export_jobs.update({
      where: { id: jobId },
      data: {
        status: "queued",
        error: null,
        updated_at: new Date(),
      },
    });

    // ENHANCEMENT: Trigger export worker to retry this export job

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[Export Retry]", error);
    return NextResponse.json({ error: "Failed to retry export" }, { status: 500 });
  }
}
