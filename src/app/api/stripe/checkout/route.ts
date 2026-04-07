import { NextRequest, NextResponse } from "next/server";

import { withManager } from "@/lib/auth/withAuth";
import { isBetaMode } from "@/lib/beta";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStripeClient } from "@/lib/stripe";

const stripe = getStripeClient()!;

export const dynamic = "force-dynamic";

const handleCheckout = withManager(async (request: NextRequest, { userId, orgId }) => {
  try {
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    if (isBetaMode()) {
      return NextResponse.json(
        {
          error: "Payments disabled during beta",
          message:
            "Payments are disabled during beta. A 3-day free trial will be enabled after beta testing concludes.",
        },
        { status: 403 }
      );
    }

    // Get plan and ref from URL params or body
    const { searchParams } = new URL(request.url);
    let plan = searchParams.get("plan");
    let ref = searchParams.get("ref");

    if (!plan && request.method === "POST") {
      const body = await request.json();
      plan = body.plan;
      ref = body.ref || ref;
    }

    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const freeBeta = process.env.FREE_BETA === "true";

    // FREE_BETA mode: bypass Stripe, create trial Org immediately
    if (freeBeta) {
      // Session 9: withManager provides DB org UUID via resolveOrg().
      // Use org.id (not clerkOrgId) for lookups.
      let Org = await prisma.org.findUnique({
        where: { id: orgId },
      });

      if (!Org) {
        Org = await prisma.org.upsert({
          where: { id: orgId },
          update: { planId: plan },
          create: {
            id: orgId,
            clerkOrgId: `org_${orgId}`,
            name: "Beta Organization",
            planId: plan,
          } as any,
        });
      }

      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?beta=true`);
    }

    // Production mode: create Stripe checkout session
    // Session 9: Use org.id (DB UUID from withManager) not clerkOrgId
    const Org = await prisma.org.findUnique({
      where: { id: orgId },
      include: { Subscription: true },
    });

    let customerId = Org?.Subscription?.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: {
          clerkOrgId: orgId,
          clerkUserId: userId,
        },
      });
      customerId = customer.id;
    }

    // Get price ID from environment variable (set during deployment)
    const priceId = process.env[`STRIPE_PRICE_${plan.toUpperCase()}`];

    if (!priceId) {
      return NextResponse.json(
        { error: `Stripe price not configured for ${plan} plan` },
        { status: 500 }
      );
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      automatic_tax: { enabled: true }, // ✅ Stripe automatic tax
      subscription_data: {
        metadata: {
          orgId: orgId,
          ref: ref || "",
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        clerkOrgId: orgId,
        clerkUserId: userId,
        planId: plan,
        orgId: orgId,
        ref: ref || "",
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    logger.error("[STRIPE_CHECKOUT] Error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
});

export const GET = handleCheckout;
export const POST = handleCheckout;
