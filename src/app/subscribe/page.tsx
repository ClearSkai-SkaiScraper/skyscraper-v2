/* eslint-disable no-restricted-syntax */
// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * /subscribe — Automatic Stripe Checkout redirect for new Pro users.
 *
 * Flow:
 *   1. Verify user is authenticated (redirect to /sign-in if not)
 *   2. Ensure org exists (auto-create if needed via getActiveOrgSafe)
 *   3. If already subscribed → redirect to /dashboard
 *   4. Create Stripe Checkout Session (hosted by Stripe — PCI compliant)
 *   5. Redirect to Stripe Checkout URL
 *
 * The user's card info is captured entirely on Stripe's hosted page.
 * Our server never touches card data.
 */
export default async function SubscribePage() {
  // ── 1. Auth check ──────────────────────────────────────────────────────
  const user = await currentUser();
  if (!user?.id) {
    redirect("/sign-in?redirect_url=/subscribe");
  }

  // ── 2. Ensure org exists ───────────────────────────────────────────────
  let orgId: string | null = null;

  try {
    const { getActiveOrgSafe } = await import("@/lib/auth/getActiveOrgSafe");
    const orgResult = await getActiveOrgSafe({ allowAutoCreate: true });
    if (orgResult.ok) {
      orgId = orgResult.org.id;
    }
  } catch (e) {
    logger.error("[SUBSCRIBE] getActiveOrgSafe error", { error: e });
  }

  if (!orgId) {
    // Fallback: try resolveOrgSafe
    try {
      const { resolveOrgSafe } = await import("@/lib/org/resolveOrg");
      const orgCtx = await resolveOrgSafe();
      orgId = orgCtx?.orgId ?? null;
    } catch {
      // Last resort — send to dashboard where layout will auto-create org
      logger.warn("[SUBSCRIBE] Could not resolve org — falling back to /dashboard");
      redirect("/dashboard");
    }
  }

  if (!orgId) {
    // If we truly can't get an org, send to dashboard (layout auto-creates)
    redirect("/dashboard");
  }

  // ── 3. Check existing subscription ─────────────────────────────────────
  try {
    const existing = await prisma.subscription.findUnique({
      where: { orgId },
      select: { status: true },
    });

    if (existing && (existing.status === "active" || existing.status === "trialing")) {
      logger.info("[SUBSCRIBE] Already subscribed, redirecting to dashboard", { orgId });
      redirect("/dashboard");
    }
  } catch (e) {
    logger.warn("[SUBSCRIBE] Subscription check failed", { error: e });
    // Continue to checkout — better to let them subscribe than block
  }

  // ── 4. Create Stripe Checkout Session ──────────────────────────────────
  const stripe = getStripeClient();
  if (!stripe) {
    logger.error("[SUBSCRIBE] Stripe client unavailable");
    redirect("/dashboard"); // Fall back to SubscriptionGate
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    logger.error("[SUBSCRIBE] STRIPE_PRICE_ID not configured");
    redirect("/dashboard");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.skaiscrape.com";

  // Get or create Stripe customer for this org
  let stripeCustomerId: string | null = null;
  try {
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { stripeCustomerId: true, name: true },
    });

    stripeCustomerId = org?.stripeCustomerId ?? null;

    if (!stripeCustomerId) {
      const email = user.emailAddresses[0]?.emailAddress || "";
      const customer = await stripe.customers.create({
        email,
        name: org?.name || `Org ${orgId}`,
        metadata: { orgId, userId: user.id },
      });
      stripeCustomerId = customer.id;

      await prisma.org.update({
        where: { id: orgId },
        data: { stripeCustomerId: customer.id },
      });
    }
  } catch (e) {
    logger.error("[SUBSCRIBE] Stripe customer creation failed", { error: e });
    redirect("/dashboard");
  }

  // Create checkout session — 1 seat, 14-day free trial
  try {
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 3,
        metadata: { orgId, seatCount: "1" },
      },
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/dashboard?checkout=cancelled`,
      metadata: {
        orgId,
        userId: user.id,
        seatCount: "1",
        source: "post-signup",
      },
    });

    logger.info("[SUBSCRIBE] Checkout session created", {
      orgId,
      userId: user.id,
      sessionId: session.id,
    });

    // ── 5. Redirect to Stripe Checkout ─────────────────────────────────
    if (session.url) {
      redirect(session.url);
    }
  } catch (e) {
    logger.error("[SUBSCRIBE] Checkout session creation failed", { error: e });
  }

  // Fallback: if Stripe redirect fails, go to dashboard
  redirect("/dashboard");
}
