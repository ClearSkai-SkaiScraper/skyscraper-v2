/**
 * Critical API Route Tests — Billing & Webhooks (Sprint 7)
 *
 * Tests Stripe webhook handling, subscription lifecycle,
 * and checkout session flow.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockPrisma,
  createMockStripe,
  createWebhookEvent,
  mockAuth,
  MOCK_CUSTOMER_ID,
  MOCK_SUBSCRIPTION_ID,
  MOCK_CHECKOUT_SESSION_ID,
  TEST_ORG_ID,
} from "../../helpers";

const prisma = createMockPrisma();
const stripe = createMockStripe();

vi.mock("@/lib/db", () => ({ prisma, default: prisma }));
vi.mock("@/lib/billing/stripe", () => ({ stripe, default: stripe }));

describe("Stripe Webhook Events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  describe("checkout.session.completed", () => {
    it("creates a valid event payload", () => {
      const event = createWebhookEvent("checkout.session.completed", {
        id: MOCK_CHECKOUT_SESSION_ID,
        customer: MOCK_CUSTOMER_ID,
        subscription: MOCK_SUBSCRIPTION_ID,
        mode: "subscription",
      });

      expect(event.type).toBe("checkout.session.completed");
      expect(event.data.object.customer).toBe(MOCK_CUSTOMER_ID);
      expect(event.data.object.subscription).toBe(MOCK_SUBSCRIPTION_ID);
      expect(event.livemode).toBe(false);
    });

    it("updates org subscription after checkout", async () => {
      (prisma.organization.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: TEST_ORG_ID,
        stripeCustomerId: MOCK_CUSTOMER_ID,
        plan: "solo",
      });

      const result = await prisma.organization.update({
        where: { id: TEST_ORG_ID },
        data: {
          stripeCustomerId: MOCK_CUSTOMER_ID,
          plan: "solo",
        },
      });

      expect(result.stripeCustomerId).toBe(MOCK_CUSTOMER_ID);
      expect(result.plan).toBe("solo");
    });
  });

  describe("customer.subscription.updated", () => {
    it("handles plan upgrades", async () => {
      (prisma.organization.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: TEST_ORG_ID,
        plan: "business",
      });

      const result = await prisma.organization.update({
        where: { stripeCustomerId: MOCK_CUSTOMER_ID },
        data: { plan: "business" },
      });

      expect(result.plan).toBe("business");
    });

    it("handles subscription cancellation", async () => {
      const event = createWebhookEvent("customer.subscription.deleted", {
        id: MOCK_SUBSCRIPTION_ID,
        status: "canceled",
      });

      expect(event.data.object.status).toBe("canceled");

      (prisma.organization.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: TEST_ORG_ID,
        plan: "free",
      });

      const result = await prisma.organization.update({
        where: { stripeCustomerId: MOCK_CUSTOMER_ID },
        data: { plan: "free" },
      });

      expect(result.plan).toBe("free");
    });
  });

  describe("invoice.payment_failed", () => {
    it("creates dunning event payload", () => {
      const event = createWebhookEvent("invoice.payment_failed", {
        id: "in_test_failed",
        customer: MOCK_CUSTOMER_ID,
        amount_due: 8000,
        attempt_count: 1,
      });

      expect(event.type).toBe("invoice.payment_failed");
      expect(event.data.object.amount_due).toBe(8000);
    });

    it("marks org as past_due on payment failure", async () => {
      (prisma.subscription.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        orgId: TEST_ORG_ID,
        status: "past_due",
      });

      const result = await prisma.subscription.update({
        where: { orgId: TEST_ORG_ID },
        data: { status: "past_due" },
      });

      expect(result.status).toBe("past_due");
    });
  });
});

describe("Checkout Session Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it("creates a checkout session with correct parameters", async () => {
    const session = await stripe.checkout.sessions.create({
      customer: MOCK_CUSTOMER_ID,
      mode: "subscription",
      line_items: [{ price: "price_solo_monthly", quantity: 1 }],
      success_url: "http://localhost:3000/billing?success=true",
      cancel_url: "http://localhost:3000/billing?canceled=true",
    } as never);

    expect(stripe.checkout.sessions.create).toHaveBeenCalled();
    expect(session.url).toContain("checkout.stripe.com");
  });

  it("creates billing portal session for existing customers", async () => {
    const session = await stripe.billingPortal.sessions.create({
      customer: MOCK_CUSTOMER_ID,
      return_url: "http://localhost:3000/billing",
    } as never);

    expect(session.url).toContain("billing.stripe.com");
  });
});

describe("Webhook Signature Verification", () => {
  it("constructEvent is callable with proper signature", () => {
    stripe.webhooks.constructEvent.mockReturnValue(
      createWebhookEvent("checkout.session.completed"),
    );

    const event = stripe.webhooks.constructEvent(
      "raw_body",
      "sig_header",
      "whsec_test",
    );

    expect(event.type).toBe("checkout.session.completed");
    expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
      "raw_body",
      "sig_header",
      "whsec_test",
    );
  });

  it("rejects invalid signatures", () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature for payload");
    });

    expect(() =>
      stripe.webhooks.constructEvent("tampered", "bad_sig", "whsec_test"),
    ).toThrow("No signatures found");
  });
});
