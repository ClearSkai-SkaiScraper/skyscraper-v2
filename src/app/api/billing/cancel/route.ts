export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/billing/cancel
 *
 * Records cancellation feedback (reason + freeform)
 * before user is sent to Stripe portal for actual cancellation.
 */

import { NextRequest, NextResponse } from "next/server";

import { withManager } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const POST = withManager(async (req: NextRequest, { orgId, userId }) => {
  try {
    const body = await req.json();
    const { reason, feedback } = body;

    // Store cancellation feedback in org metadata
    await prisma.org.update({
      where: { id: orgId },
      data: {
        cancellationReason: reason || null,
        cancellationFeedback: feedback || null,
        cancellationRequestedAt: new Date(),
        cancellationRequestedBy: userId,
      } as any,
    });

    logger.info("[BILLING_CANCEL]", { orgId, userId, reason });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[BILLING_CANCEL] Error:", error);
    return NextResponse.json({ error: "Failed to record cancellation" }, { status: 500 });
  }
});
