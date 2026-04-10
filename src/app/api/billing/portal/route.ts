export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { withManager } from "@/lib/auth/withAuth";
import { createBillingPortalSession } from "@/lib/billing/portal";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const POST = withManager(async (req: NextRequest, { orgId, userId }) => {
  try {
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    // withAuth provides DB-backed orgId with membership already verified
    const resolvedOrg = await prisma.org.findUnique({
      where: { id: orgId },
      select: { id: true, stripeCustomerId: true },
    });

    if (!resolvedOrg || !resolvedOrg.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer found. Please subscribe first." },
        { status: 404 }
      );
    }

    // Create portal session
    const returnUrl = `${
      // eslint-disable-next-line no-restricted-syntax
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    }/account/billing`;

    const portalUrl = await createBillingPortalSession(resolvedOrg.stripeCustomerId, returnUrl);

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    logger.error("[BILLING_PORTAL]", { error });
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
});
