/**
 * ============================================================================
 * BILLING GUARD — Unit Tests
 * ============================================================================
 *
 * Tests for requireActiveSubscription billing guard:
 *   1. Returns subscription when status is 'active'
 *   2. Returns subscription when status is 'trialing'
 *   3. Throws SubscriptionRequiredError when no subscription exists
 *   4. Throws SubscriptionRequiredError when subscription is 'canceled'
 *   5. Throws SubscriptionRequiredError when subscription is 'past_due'
 *   6. Falls back to Org.subscriptionStatus when Subscription table is empty
 *
 * ============================================================================
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ------------------------------------------------------------------ */
/*  Hoisted mocks                                                      */
/* ------------------------------------------------------------------ */

const { mockSubscriptionFindFirst, mockOrgFindUnique } = vi.hoisted(() => ({
  mockSubscriptionFindFirst: vi.fn(),
  mockOrgFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    subscription: {
      findFirst: (...args: unknown[]) => mockSubscriptionFindFirst(...args),
    },
    org: {
      findUnique: (...args: unknown[]) => mockOrgFindUnique(...args),
    },
  },
}));

// Disable beta bypass and admin bypass so tests hit the real Prisma logic
vi.mock("@/lib/beta", () => ({
  isBetaMode: () => false,
}));

vi.mock("@/lib/security/roles", () => ({
  isPlatformAdmin: async () => false,
}));

/* ------------------------------------------------------------------ */
/*  Import after mocks                                                 */
/* ------------------------------------------------------------------ */

import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("requireActiveSubscription", () => {
  const TEST_ORG_ID = "org_test_123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns subscription when status is 'active'", async () => {
    const mockSub = {
      id: "sub_123",
      status: "active",
      seatCount: 5,
      currentPeriodEnd: new Date(),
      stripeSubId: "sub_stripe_123",
    };
    mockSubscriptionFindFirst.mockResolvedValue(mockSub);

    const result = await requireActiveSubscription(TEST_ORG_ID);

    expect(result).toEqual(mockSub);
    expect(mockSubscriptionFindFirst).toHaveBeenCalledWith({
      where: { orgId: TEST_ORG_ID },
      select: {
        id: true,
        status: true,
        seatCount: true,
        currentPeriodEnd: true,
        stripeSubId: true,
      },
    });
  });

  it("returns subscription when status is 'trialing'", async () => {
    const mockSub = {
      id: "sub_456",
      status: "trialing",
      seatCount: 1,
      currentPeriodEnd: new Date(),
      stripeSubId: "sub_stripe_456",
    };
    mockSubscriptionFindFirst.mockResolvedValue(mockSub);

    const result = await requireActiveSubscription(TEST_ORG_ID);

    expect(result).toEqual(mockSub);
  });

  it("throws SubscriptionRequiredError when no subscription exists", async () => {
    mockSubscriptionFindFirst.mockResolvedValue(null);
    mockOrgFindUnique.mockResolvedValue(null);

    await expect(requireActiveSubscription(TEST_ORG_ID)).rejects.toThrow(SubscriptionRequiredError);
  });

  it("throws SubscriptionRequiredError when subscription is 'canceled'", async () => {
    mockSubscriptionFindFirst.mockResolvedValue({
      id: "sub_789",
      status: "canceled",
      seatCount: 1,
    });
    mockOrgFindUnique.mockResolvedValue(null);

    await expect(requireActiveSubscription(TEST_ORG_ID)).rejects.toThrow(SubscriptionRequiredError);
  });

  it("throws SubscriptionRequiredError when subscription is 'past_due'", async () => {
    mockSubscriptionFindFirst.mockResolvedValue({
      id: "sub_abc",
      status: "past_due",
      seatCount: 1,
    });
    mockOrgFindUnique.mockResolvedValue({ subscriptionStatus: "past_due" });

    await expect(requireActiveSubscription(TEST_ORG_ID)).rejects.toThrow(SubscriptionRequiredError);
  });

  it("falls back to Org.subscriptionStatus when Subscription table is empty", async () => {
    mockSubscriptionFindFirst.mockResolvedValue(null);
    mockOrgFindUnique.mockResolvedValue({ subscriptionStatus: "active" });

    const result = await requireActiveSubscription(TEST_ORG_ID);

    expect(result).toEqual({
      id: TEST_ORG_ID,
      status: "active",
      seatCount: 1,
    });
    expect(mockOrgFindUnique).toHaveBeenCalledWith({
      where: { id: TEST_ORG_ID },
      select: { subscriptionStatus: true },
    });
  });

  it("throws when Org fallback has canceled status", async () => {
    mockSubscriptionFindFirst.mockResolvedValue(null);
    mockOrgFindUnique.mockResolvedValue({ subscriptionStatus: "canceled" });

    await expect(requireActiveSubscription(TEST_ORG_ID)).rejects.toThrow(SubscriptionRequiredError);
  });
});
