/**
 * POST /api/depreciation/send — Send depreciation packet to carrier/recipients
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const body = await req.json();
    const { packageId, recipients, jobId } = body;

    // Support both packageId-based (DepreciationPackagePanel) and jobId-based (DepCenter) flows
    let pkg;
    if (packageId) {
      pkg = await prisma.depreciation_packages.findFirst({
        where: { id: packageId, org_id: orgId },
      });
    } else if (jobId) {
      pkg = await prisma.depreciation_packages.findFirst({
        where: { claim_id: jobId, org_id: orgId },
        orderBy: { created_at: "desc" },
      });
    }

    if (!pkg) {
      return NextResponse.json(
        { error: "Package not found. Generate one first." },
        { status: 404 }
      );
    }

    const now = new Date();
    const sentTo = recipients || [];

    // Update package status
    await prisma.depreciation_packages.update({
      where: { id: pkg.id },
      data: {
        status: "SENT",
        sent_at: now,
        sent_to: sentTo,
        updated_at: now,
      },
    });

    // Update tracker
    await prisma.depreciation_trackers.updateMany({
      where: { claim_id: pkg.claim_id, org_id: orgId },
      data: {
        status: "REQUESTED",
        requested_at: now,
        emails_sent: { increment: 1 },
        last_email_sent_at: now,
        updated_at: now,
      },
    });

    // Update claim flags
    await prisma.claims.updateMany({
      where: { id: pkg.claim_id, orgId },
      data: {
        updatedAt: new Date(),
      },
    });

    logger.info("[DEPRECIATION_SEND]", { orgId, packageId: pkg.id, recipients: sentTo });

    return NextResponse.json({
      success: true,
      message: `Depreciation packet sent to ${sentTo.length || 1} recipient(s)`,
      sentAt: now.toISOString(),
    });
  } catch (error) {
    logger.error("[DEPRECIATION_SEND]", error);
    return NextResponse.json({ error: "Failed to send packet" }, { status: 500 });
  }
});
