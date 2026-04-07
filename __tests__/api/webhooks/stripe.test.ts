/**
 * TEST #134 — Stripe webhook route
 *
 * Validates:
 *   • Missing stripe-signature header → 400
 *   • Invalid signature (constructEvent throws) → 400
 *   • Valid event is acknowledged with { received: true }
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ------------------------------------------------------------------ */
/*  Mocks – vi.hoisted ensures variables are available in mock factory */
/* ------------------------------------------------------------------ */

const { mockConstructEvent, mockCreate, mockQueryRaw, mockUpdate, mockFindFirst, mockFindUnique } =
  vi.hoisted(() => {
    // Must set env BEFORE the route module is evaluated (top-level guard)
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_fake";
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
    return {
      mockConstructEvent: vi.fn(),
      mockCreate: vi.fn(),
      mockQueryRaw: vi.fn(),
      mockUpdate: vi.fn(),
      mockFindFirst: vi.fn(),
      mockFindUnique: vi.fn(),
    };
  });

// Stripe mock
vi.mock("stripe", () => {
  function Stripe() {
    return {
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    };
  }
  return { default: Stripe };
});

// Prisma mock
vi.mock("@/lib/prisma", () => ({
  default: {
    webhookEvent: { create: (...a: unknown[]) => mockCreate(...a) },
    $queryRaw: (...a: unknown[]) => mockQueryRaw(...a),
    users: {
      update: (...a: unknown[]) => mockUpdate(...a),
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
    },
    tokenLedger: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
    },
  },
}));

// Logger mock
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Sentry mock
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  startSpan: vi.fn((_opts: unknown, cb: () => unknown) => cb()),
}));

// Mail mock
vi.mock("@/lib/mail", () => ({
  safeSendEmail: vi.fn().mockResolvedValue({ success: true }),
  createWelcomeEmail: vi.fn().mockReturnValue({ to: "x", subject: "x", html: "x" }),
  createTrialEndingEmail: vi.fn().mockReturnValue({ to: "x", subject: "x", html: "x" }),
  createPaymentFailedEmail: vi.fn().mockReturnValue({ to: "x", subject: "x", html: "x" }),
}));

// ratelimit mock — always allow
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 60_000,
  }),
}));

// @/lib/stripe mock — ensure getStripeClient returns mock with constructEvent
vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({ trial_end: null }),
    },
  }),
}));

// Token utilities
vi.mock("@/lib/tokens/index", () => ({
  ensureTokenRow: vi.fn().mockResolvedValue(undefined),
  refill: vi.fn().mockResolvedValue(undefined),
  resetMonthly: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/tokens/planQuotas", () => ({
  PRICE_TO_PLAN: {},
}));

// Referral utilities
vi.mock("@/lib/referrals/utils", () => ({
  awardFirstOrTokens: vi.fn().mockResolvedValue(undefined),
}));

/* ------------------------------------------------------------------ */
/*  Env vars needed by the route (process.env.STRIPE_*)                */
/* ------------------------------------------------------------------ */
beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_fake";
});

/* ------------------------------------------------------------------ */
/*  Import the route handler AFTER all mocks are wired                 */
/* ------------------------------------------------------------------ */
import { POST } from "@/app/api/webhooks/stripe/route";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("https://example.com/api/webhooks/stripe", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "127.0.0.1",
      ...headers,
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("POST /api/webhooks/stripe", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const req = makeRequest('{"type":"test"}');
    // No stripe-signature header at all
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/[Nn]o signature/);
  });

  it("returns 400 when signature is invalid (constructEvent throws)", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Signature mismatch");
    });

    const req = makeRequest('{"type":"test"}', {
      "stripe-signature": "t=123,v1=bad",
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/[Ii]nvalid signature/);
  });

  it("returns 200 and processes a valid event", async () => {
    // constructEvent succeeds
    mockConstructEvent.mockReturnValue({
      id: "evt_test_123",
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_fake",
          subscription: "sub_fake",
          metadata: {},
        },
      },
    });

    // saveEventId succeeds (new event)
    mockCreate.mockResolvedValue({ id: "evt_test_123" });

    // userIdFromCustomer
    mockQueryRaw.mockResolvedValue([{ id: "user_abc" }]);

    const req = makeRequest('{"type":"checkout.session.completed"}', {
      "stripe-signature": "t=123,v1=valid",
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it("returns 200 with processed=false for duplicate events (idempotency)", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_dup",
      type: "invoice.paid",
      data: { object: {} },
    });

    // Simulate unique constraint violation (already processed)
    mockCreate.mockRejectedValue({ code: "P2002" });

    const req = makeRequest("{}", {
      "stripe-signature": "t=123,v1=valid",
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.processed).toBe(false);
  });
});
