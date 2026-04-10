export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/billing/cancel
 *
 * Records cancellation feedback (reason + freeform)
 * before user is sent to Stripe portal for actual cancellation.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withManager } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const cancelSchema = z.object({
  reason: z
    .enum([
      "too_expensive",
      "not_enough_features",
      "switched_to_competitor",
      "no_longer_needed",
      "other",
    ])
    .optional(),
  feedback: z.string().max(2000).optional(),
});

export const POST = withManager(async (req: NextRequest, { orgId, userId }) => {
  try {
    const raw = await req.json();
    const parsed = cancelSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { reason, feedback } = parsed.data;

    // Store cancellation feedback in org metadata
    await prisma.org.update({
      where: { id: orgId },
      data: {
        cancellationReason: reason || null,
        cancellationFeedback: feedback || null,
        cancellationRequestedAt: new Date(),
        cancellationRequestedBy: userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    logger.info("[BILLING_CANCEL]", { orgId, userId, reason });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[BILLING_CANCEL] Error:", error);
    return NextResponse.json({ error: "Failed to record cancellation" }, { status: 500 });
  }
});
