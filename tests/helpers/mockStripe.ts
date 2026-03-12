/**
 * Mock Stripe helper (Sprint 7 — Test Infrastructure)
 *
 * Provides a mock Stripe instance and webhook event factory for
 * testing billing routes and webhook handlers.
 */

import { vi } from "vitest";

// ── Fake Stripe IDs ─────────────────────────────────────────────────
export const MOCK_CUSTOMER_ID = "cus_test_123";
export const MOCK_SUBSCRIPTION_ID = "sub_test_456";
export const MOCK_PRICE_ID = "price_test_solo";
export const MOCK_PAYMENT_INTENT_ID = "pi_test_789";
export const MOCK_INVOICE_ID = "in_test_abc";
export const MOCK_CHECKOUT_SESSION_ID = "cs_test_def";

// ── Mock Stripe client ──────────────────────────────────────────────
export function createMockStripe() {
  return {
    customers: {
      create: vi.fn().mockResolvedValue({ id: MOCK_CUSTOMER_ID }),
      retrieve: vi.fn().mockResolvedValue({ id: MOCK_CUSTOMER_ID, email: "test@test.com" }),
      update: vi.fn().mockResolvedValue({ id: MOCK_CUSTOMER_ID }),
      del: vi.fn().mockResolvedValue({ id: MOCK_CUSTOMER_ID, deleted: true }),
    },
    subscriptions: {
      create: vi.fn().mockResolvedValue({
        id: MOCK_SUBSCRIPTION_ID,
        status: "active",
        items: { data: [{ price: { id: MOCK_PRICE_ID } }] },
      }),
      retrieve: vi.fn().mockResolvedValue({
        id: MOCK_SUBSCRIPTION_ID,
        status: "active",
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      }),
      update: vi.fn().mockResolvedValue({ id: MOCK_SUBSCRIPTION_ID }),
      cancel: vi.fn().mockResolvedValue({ id: MOCK_SUBSCRIPTION_ID, status: "canceled" }),
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: MOCK_CHECKOUT_SESSION_ID,
          url: "https://checkout.stripe.com/test",
        }),
        retrieve: vi.fn().mockResolvedValue({
          id: MOCK_CHECKOUT_SESSION_ID,
          customer: MOCK_CUSTOMER_ID,
          subscription: MOCK_SUBSCRIPTION_ID,
        }),
      },
    },
    invoices: {
      retrieve: vi.fn().mockResolvedValue({ id: MOCK_INVOICE_ID, amount_due: 8000 }),
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
    paymentIntents: {
      retrieve: vi.fn().mockResolvedValue({ id: MOCK_PAYMENT_INTENT_ID, status: "succeeded" }),
    },
    prices: {
      retrieve: vi.fn().mockResolvedValue({
        id: MOCK_PRICE_ID,
        unit_amount: 8000,
        currency: "usd",
        recurring: { interval: "month" },
      }),
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/session/test" }),
      },
    },
  };
}

/**
 * Wire up so `import { stripe } from "@/lib/billing/stripe"` resolves to mock.
 */
export function mockStripeModule(mockStripe?: ReturnType<typeof createMockStripe>) {
  const s = mockStripe ?? createMockStripe();

  vi.mock("@/lib/billing/stripe", () => ({
    stripe: s,
    default: s,
  }));

  return s;
}

// ── Webhook event factory ───────────────────────────────────────────
type StripeEventType =
  | "checkout.session.completed"
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "customer.subscription.trial_will_end"
  | "invoice.paid"
  | "invoice.payment_failed"
  | "invoice.upcoming";

export function createWebhookEvent(type: StripeEventType, data: Record<string, unknown> = {}) {
  return {
    id: `evt_test_${Date.now()}`,
    object: "event" as const,
    type,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: `obj_${Date.now()}`,
        customer: MOCK_CUSTOMER_ID,
        ...data,
      } as Record<string, unknown>,
    },
    livemode: false,
    api_version: "2024-06-20",
  };
}
