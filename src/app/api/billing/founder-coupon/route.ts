export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/billing/founder-coupon
 *
 * Creates or retrieves the "FOUNDER50" Stripe coupon (50% off forever).
 * Admin only. Used during early sales to offer founder pricing.
 */

import { NextRequest, NextResponse } from "next/server";

import { withManager } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStripeClient } from "@/lib/stripe";

const COUPON_ID = "FOUNDER50";

export const POST = withManager(async (req: NextRequest, { orgId, userId }) => {
  try {
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    // Try to retrieve existing coupon
    let coupon;
    try {
      coupon = await stripe.coupons.retrieve(COUPON_ID);
    } catch {
      // Doesn't exist — create it
      coupon = await stripe.coupons.create({
        id: COUPON_ID,
        percent_off: 50,
        duration: "forever",
        name: "Founder Pricing — 50% Off Forever",
        metadata: {
          createdBy: userId,
          orgId,
          purpose: "early_adopter_founder_pricing",
        },
      });
      logger.info("[FOUNDER_COUPON] Created new coupon", { couponId: COUPON_ID });
    }

    // Create a promotion code for easy sharing
    let promoCode;
    try {
      const existingCodes = await stripe.promotionCodes.list({
        coupon: COUPON_ID,
        code: "FOUNDER50",
        limit: 1,
      });

      if (existingCodes.data.length > 0) {
        promoCode = existingCodes.data[0];
      } else {
        promoCode = await stripe.promotionCodes.create({
          coupon: COUPON_ID,
          code: "FOUNDER50",
          max_redemptions: 100,
          metadata: { purpose: "founder_pricing" },
        });
      }
    } catch {
      // Promo code creation is optional
    }

    return NextResponse.json({
      coupon: {
        id: coupon.id,
        percentOff: coupon.percent_off,
        duration: coupon.duration,
        name: coupon.name,
      },
      promoCode: promoCode ? { code: promoCode.code, id: promoCode.id } : null,
    });
  } catch (error) {
    logger.error("[FOUNDER_COUPON] Error:", error);
    return NextResponse.json({ error: "Failed to manage coupon" }, { status: 500 });
  }
});
