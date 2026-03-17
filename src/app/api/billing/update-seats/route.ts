/**
 * POST /api/billing/update-seats — Update seat count (ADMIN/OWNER/MANAGER only)
 * GET  /api/billing/update-seats — View current seat info (any authenticated user)
 *
 * Updates the seat count on an existing Stripe subscription.
 * Stripe handles proration automatically.
 * Body: { seatCount: number }
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withManager } from "@/lib/auth/withAuth";
import { PRICE_PER_SEAT_CENTS, validateSeatCount } from "@/lib/billing/seat-pricing";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStripeClient } from "@/lib/stripe";

export const POST = withManager(async (req: NextRequest, { orgId, userId }) => {
  try {
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    // ── Body ────────────────────────────────────────────────────────
    const body = await req.json();
    const newSeatCount = Number(body.seatCount);
    const v = validateSeatCount(newSeatCount);
    if (!v.valid) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }

    // ── Get subscription ────────────────────────────────────────────
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (!sub || !sub.stripeSubId || !sub.stripeSubscriptionItemId) {
      return NextResponse.json(
        { error: "No active subscription found. Create one first." },
        { status: 404 }
      );
    }
    if (sub.status !== "active" && sub.status !== "trialing") {
      return NextResponse.json(
        { error: `Subscription is ${sub.status}. Cannot update seats.` },
        { status: 400 }
      );
    }

    // ── Stripe client ───────────────────────────────────────────────
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    // ── Update quantity on Stripe ───────────────────────────────────
    // Stripe automatically prorates when changing quantity mid-cycle
    await stripe.subscriptionItems.update(sub.stripeSubscriptionItemId, {
      quantity: newSeatCount,
      proration_behavior: "always_invoice",
    });

    // ── Update local record ─────────────────────────────────────────
    const oldSeatCount = sub.seatCount;
    await prisma.subscription.update({
      where: { orgId },
      data: {
        seatCount: newSeatCount,
        updatedAt: new Date(),
      },
    });

    logger.debug(`[update-seats] org=${orgId} seats: ${oldSeatCount} → ${newSeatCount}`);

    return NextResponse.json({
      success: true,
      previousSeatCount: oldSeatCount,
      newSeatCount,
      monthlyTotal: (newSeatCount * PRICE_PER_SEAT_CENTS) / 100,
      prorated: true,
    });
  } catch (error) {
    logger.error("[update-seats] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update seats" },
      { status: 500 }
    );
  }
});

/**
 * GET /api/billing/update-seats
 *
 * Returns current seat information (any authenticated user can view)
 */
export const GET = withManager(async (_req: NextRequest, { orgId }) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
    });

    // Count active users in org
    const activeUsers = await prisma.user_organizations.count({
      where: { organizationId: orgId },
    });

    return NextResponse.json({
      seatCount: sub?.seatCount || 0,
      seatsUsed: activeUsers,
      status: sub?.status || "none",
      pricePerSeat: PRICE_PER_SEAT_CENTS / 100,
      monthlyTotal: ((sub?.seatCount || 0) * PRICE_PER_SEAT_CENTS) / 100,
    });
  } catch (error) {
    logger.error("[update-seats GET] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to get seat info" },
      { status: 500 }
    );
  }
});
