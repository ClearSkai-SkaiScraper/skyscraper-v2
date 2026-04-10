export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { getCustomerInvoices, getCustomerPaymentMethods } from "@/lib/billing/portal";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    // withAuth provides DB-backed orgId with membership already verified

    // Fetch Org with billing info using DB-backed orgId from withAuth
    const Org = await prisma.org.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
        planKey: true,
        trialEndsAt: true,
        BillingSettings: {
          select: {
            autoRefill: true,
            refillThreshold: true,
          },
        },
      },
    });

    if (!Org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let paymentMethods: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let invoices: any[] = [];

    // Fetch from Stripe if customer exists
    if (Org.stripeCustomerId) {
      try {
        paymentMethods = await getCustomerPaymentMethods(Org.stripeCustomerId);
        invoices = await getCustomerInvoices(Org.stripeCustomerId, 12);
      } catch (stripeError) {
        logger.error("Stripe fetch error (non-blocking):", stripeError);
      }
    }

    return NextResponse.json({
      org: {
        id: Org.id,
        name: Org.name,
        subscriptionStatus: Org.subscriptionStatus,
        planKey: Org.planKey,
        trialEndsAt: Org.trialEndsAt,
      },
      paymentMethods,
      invoices,
      autoRefill: {
        enabled: Org.BillingSettings?.autoRefill ?? false,
        threshold: Org.BillingSettings?.refillThreshold ?? 10,
      },
    });
  } catch (error) {
    logger.error("Error fetching billing info:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
