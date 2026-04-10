import Stripe from "stripe";

import { logger } from "@/lib/logger";

let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (_stripe) return _stripe;
  // eslint-disable-next-line no-restricted-syntax
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    logger.warn("[stripe] STRIPE_SECRET_KEY missing – returning null client");
    return null;
  }
  // eslint-disable-next-line no-restricted-syntax
  _stripe = new Stripe(key, { apiVersion: "2022-11-15" });
  return _stripe;
}

// Backward compatibility named export (may be imported directly)
export const stripe = getStripeClient();

export function constructStripeEvent(raw: Buffer, signature: string) {
  // eslint-disable-next-line no-restricted-syntax
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET not set");
  }
  const client = getStripeClient();
  if (!client) throw new Error("Stripe client unavailable (missing key)");
  return client.webhooks.constructEvent(raw, signature, secret);
}
