/**
 * POST /api/billing/create-subscription
 *
 * Creates a Stripe customer + subscription for the current org.
 * Body: { seatCount: number }
 *
 * Flow:
 *   1. Auth → get orgId (via withAuth — DB-backed, server-side)
 *   2. Validate seatCount (1–500)
 *   3. Create or find Stripe customer
 *   4. Create Stripe subscription with quantity = seatCount
 *   5. Upsert local Subscription row
 *   6. Return clientSecret for payment confirmation
 *
 * RBAC: ADMIN or OWNER only — billing mutations are restricted.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { currentUser } from "@clerk/nextjs/server";
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

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ── Body ────────────────────────────────────────────────────────
    const body = await req.json();
    const seatCount = Number(body.seatCount);
    const v = validateSeatCount(seatCount);
    if (!v.valid) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }

    // ── Check for existing subscription ─────────────────────────────
    const existing = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (existing && existing.status === "active") {
      return NextResponse.json(
        { error: "Organization already has an active subscription. Use update-seats instead." },
        { status: 409 }
      );
    }

    // ── Stripe client ───────────────────────────────────────────────
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: "STRIPE_PRICE_ID not configured" }, { status: 503 });
    }

    // ── Get or create Stripe customer ───────────────────────────────
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { stripeCustomerId: true, name: true },
    });

    let stripeCustomerId = org?.stripeCustomerId;

    if (!stripeCustomerId) {
      const email = user.emailAddresses[0]?.emailAddress || "";
      const customer = await stripe.customers.create({
        email,
        name: org?.name || `Org ${orgId}`,
        metadata: { orgId, userId },
      });
      stripeCustomerId = customer.id;

      // Store on Org
      await prisma.org.update({
        where: { id: orgId },
        data: { stripeCustomerId: customer.id },
      });
    }

    // ── Create subscription ─────────────────────────────────────────
    // 14-day free trial for all new subscriptions
    const TRIAL_DAYS = 14;

    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price: priceId,
          quantity: seatCount,
        },
      ],
      trial_period_days: TRIAL_DAYS,
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      metadata: { orgId, seatCount: String(seatCount) },
      expand: ["latest_invoice.payment_intent"],
    });

    // ── Upsert local record ─────────────────────────────────────────
    const subItemId = subscription.items.data[0]?.id;

    await prisma.subscription.upsert({
      where: { orgId },
      create: {
        id: subscription.id,
        orgId,
        stripeCustomerId,
        stripeSubId: subscription.id,
        stripeSubscriptionItemId: subItemId,
        seatCount,
        pricePerSeat: PRICE_PER_SEAT_CENTS,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        updatedAt: new Date(),
      },
      update: {
        stripeSubId: subscription.id,
        stripeSubscriptionItemId: subItemId,
        seatCount,
        pricePerSeat: PRICE_PER_SEAT_CENTS,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        updatedAt: new Date(),
      },
    });

    // Also update Org stripe fields
    await prisma.org.update({
      where: { id: orgId },
      data: {
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
      },
    });

    // ── Return client secret for payment ────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = subscription.latest_invoice as any;
    const clientSecret = invoice?.payment_intent?.client_secret || null;

    logger.info("[SUBSCRIPTION_CREATED]", {
      orgId,
      userId,
      subscriptionId: subscription.id,
      seatCount,
      status: subscription.status,
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,
      status: subscription.status,
      seatCount,
      monthlyTotal: (seatCount * PRICE_PER_SEAT_CENTS) / 100,
    });
  } catch (error) {
    logger.error("[create-subscription] Error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to create subscription" },
      { status: 500 }
    );
  }
});
