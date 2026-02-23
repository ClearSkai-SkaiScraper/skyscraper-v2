/**
 * GET /api/billing/seats
 *
 * Returns seat usage, limits, and subscription info for the current org.
 * Used by the billing settings page and seat enforcement UI.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { checkSeatAvailability } from "@/lib/billing/seat-enforcement";
import { monthlyFormatted, PRICE_PER_SEAT_CENTS, pricingSummary } from "@/lib/billing/seat-pricing";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    // Get seat check
    const seatCheck = await checkSeatAvailability(orgId);

    // Get subscription details
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
      select: {
        seatCount: true,
        status: true,
        currentPeriodEnd: true,
        pricePerSeat: true,
        stripeSubId: true,
      },
    });

    const summary = pricingSummary(sub?.seatCount || 1);

    return NextResponse.json({
      ...seatCheck,
      subscription: sub
        ? {
            status: sub.status,
            seatCount: sub.seatCount,
            pricePerSeat: (sub.pricePerSeat || PRICE_PER_SEAT_CENTS) / 100,
            monthlyTotal: monthlyFormatted(sub.seatCount),
            currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || null,
            hasSubscription: true,
          }
        : {
            status: "none",
            seatCount: 0,
            pricePerSeat: PRICE_PER_SEAT_CENTS / 100,
            monthlyTotal: "$0.00",
            currentPeriodEnd: null,
            hasSubscription: false,
          },
      pricing: summary,
    });
  } catch (error) {
    logger.error("[billing/seats] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check seats" },
      { status: 500 }
    );
  }
});
