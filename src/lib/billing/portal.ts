/**
 * Stripe Billing Portal integration
 * Allows customers to manage payment methods, view invoices, and update subscriptions
 */

import { getStripeClient } from "@/lib/stripe";

const stripe = getStripeClient();

/**
 * Create a Stripe Billing Portal session
 * Returns URL that customers can use to manage their subscription
 */
export async function createBillingPortalSession(
  stripeCustomerId: string,
  returnUrl?: string
): Promise<string> {
  if (!stripe) throw new Error("Stripe client not initialized");
  const portalReturnUrl =
    returnUrl ||
    // eslint-disable-next-line no-restricted-syntax
    process.env.STRIPE_BILLING_PORTAL_RETURN_URL ||
    // eslint-disable-next-line no-restricted-syntax
    `${process.env.NEXT_PUBLIC_APP_URL}/account/billing`;

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: portalReturnUrl,
  });

  return session.url;
}

/**
 * Get customer's payment methods
 */
export async function getCustomerPaymentMethods(stripeCustomerId: string) {
  if (!stripe) throw new Error("Stripe client not initialized");
  const paymentMethods = await stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: "card",
  });

  return paymentMethods.data.map((pm) => ({
    id: pm.id,
    brand: pm.card?.brand,
    last4: pm.card?.last4,
    expMonth: pm.card?.exp_month,
    expYear: pm.card?.exp_year,
  }));
}

/**
 * Get customer's invoices
 */
export async function getCustomerInvoices(stripeCustomerId: string, limit = 12) {
  if (!stripe) throw new Error("Stripe client not initialized");
  const invoices = await stripe.invoices.list({
    customer: stripeCustomerId,
    limit,
    expand: ["data.subscription"],
  });

  return invoices.data.map((inv) => ({
    id: inv.id,
    number: inv.number,
    amountDue: inv.amount_due,
    amountPaid: inv.amount_paid,
    currency: inv.currency,
    status: inv.status, // 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'
    created: inv.created, // Unix timestamp (seconds)
    periodStart: inv.period_start,
    periodEnd: inv.period_end,
    hostedInvoiceUrl: inv.hosted_invoice_url,
    invoicePdf: inv.invoice_pdf,
    description: inv.description,
  }));
}
