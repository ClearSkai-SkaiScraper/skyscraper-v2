export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { withManager } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStripeCustomerIdForUser } from "@/lib/stripe/customer";

export const POST = withManager(async (_req, { userId }) => {
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

    const email = user.emailAddresses[0]?.emailAddress || "";
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    const stripeCustomerId = await getStripeCustomerIdForUser(userId, email, name);

    return NextResponse.json({ stripe_customer_id: stripeCustomerId });
  } catch (error) {
    logger.error("Failed to ensure Stripe customer:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to ensure Stripe customer" },
      { status: 500 }
    );
  }
});
