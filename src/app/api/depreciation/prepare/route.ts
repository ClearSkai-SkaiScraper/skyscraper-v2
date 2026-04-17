/**
 * POST /api/depreciation/prepare — Prepare depreciation packet for a carrier
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (req: NextRequest, { orgId, userId: _userId }) => {
  try {
    const { jobId, carrier } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    const claim = await prisma.claims.findFirst({
      where: { id: jobId, orgId },
      include: {
        properties: true,
        depreciation_items: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const items = claim.depreciation_items || [];
    const totalRCV = items.reduce((sum, i) => sum + i.rcv, 0);
    const totalACV = items.reduce((sum, i) => sum + i.acv, 0);
    const totalDep = totalRCV - totalACV;

    const subject = `Depreciation Release Request — ${claim.claimNumber || claim.id} — $${totalDep.toFixed(2)}`;
    const attachments = ["Contractor Invoice", "Depreciation Worksheet", "Homeowner Acceptance"];

    if (carrier) {
      await prisma.claims.updateMany({
        where: { id: jobId, orgId },
        data: { carrier },
      });
    }

    logger.info("[DEPRECIATION_PREPARE]", { orgId, jobId, carrier, totalDep });

    return NextResponse.json({
      success: true,
      subject,
      attachments,
      carrier: carrier || claim.carrier,
      totalDepreciation: totalDep,
      itemCount: items.length,
    });
  } catch (error) {
    logger.error("[DEPRECIATION_PREPARE]", error);
    return NextResponse.json({ error: "Failed to prepare packet" }, { status: 500 });
  }
});
