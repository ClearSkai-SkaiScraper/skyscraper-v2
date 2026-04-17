/**
 * Portal Payment Session API
 * Creates a Stripe checkout session for invoice payment
 *
 * Note: This is a placeholder endpoint for the PaymentPortal component.
 * Once an invoice model is added to the schema, this can be expanded.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { logger } from "@/lib/logger";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requirePortalAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId, email } = authResult;

    const { invoiceId, amount, description } = await req.json();

    if (!invoiceId || !amount) {
      return NextResponse.json({ error: "Invoice ID and amount required" }, { status: 400 });
    }

    // Ensure stripe is available
    if (!stripe) {
      logger.warn("[PORTAL_PAYMENT] Stripe not configured");
      return NextResponse.json({ error: "Payment system not configured" }, { status: 503 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Invoice #${invoiceId}`,
              description: description || `Payment for claim services`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId,
        userId,
        type: "portal_invoice_payment",
      },
      // eslint-disable-next-line no-restricted-syntax
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/payments/success?invoice=${invoiceId}`,
      // eslint-disable-next-line no-restricted-syntax
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/payments?cancelled=true`,
    });

    logger.info("[PORTAL_PAYMENT] Created checkout session", {
      invoiceId,
      userId,
      sessionId: session.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error("[PORTAL_PAYMENT] Error creating session:", error);
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
  }
}
