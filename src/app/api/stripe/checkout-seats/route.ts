/**
 * POST /api/stripe/checkout-seats
 *
 * Creates a Stripe Checkout Session for seat-based subscriptions.
 * Can be called from both marketing pricing page (pre-auth) and pro dashboard.
 *
 * Body: { seatCount: number }
 *
 * If user is authenticated with an org:
 *   → Creates Stripe Checkout session → returns { url }
 * If not authenticated:
 *   → Returns { requiresAuth: true } so the client can redirect to sign-up
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { validateSeatCount } from "@/lib/billing/seat-pricing";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

export const POST = withOrgScope(async (req, { userId, orgId }) => {
  try {
    const body = await req.json();
    const seatCount = Number(body.seatCount);

    // Validate seat count
    const v = validateSeatCount(seatCount);
    if (!v.valid) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }

    // Auth and org are already resolved by withOrgScope
    const user = await currentUser();

    // Check for existing active subscription
    const existing = await prisma.subscription.findUnique({
      where: { orgId },
    });
    if (existing && (existing.status === "active" || existing.status === "trialing")) {
      return NextResponse.json(
        {
          error:
            "You already have an active subscription. Go to Settings → Billing to manage seats.",
          redirectTo: "/settings/billing",
        },
        { status: 409 }
      );
    }

    // Get Stripe client
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    // eslint-disable-next-line no-restricted-syntax
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: "STRIPE_PRICE_ID not configured" }, { status: 503 });
    }

    // Get or create Stripe customer
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { stripeCustomerId: true, name: true },
    });

    let stripeCustomerId = org?.stripeCustomerId;

    if (!stripeCustomerId) {
      const email = user?.emailAddresses[0]?.emailAddress || "";
      const customer = await stripe.customers.create({
        email,
        name: org?.name || `Org ${orgId}`,
        metadata: { orgId, userId },
      });
      stripeCustomerId = customer.id;

      await prisma.org.update({
        where: { id: orgId },
        data: { stripeCustomerId: customer.id },
      });
    }

    // eslint-disable-next-line no-restricted-syntax
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.skaiscrape.com";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: seatCount,
        },
      ],
      subscription_data: {
        trial_period_days: 3,
        metadata: {
          orgId,
          seatCount: String(seatCount),
        },
      },
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      success_url: `${appUrl}/settings/billing?checkout=success&seats=${seatCount}`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      metadata: {
        orgId,
        userId,
        seatCount: String(seatCount),
      },
    });

    logger.info("[STRIPE_CHECKOUT_SEATS]", {
      orgId,
      userId,
      seatCount,
      sessionId: session.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error("[stripe/checkout-seats] Error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
});
