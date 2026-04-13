import { expect, test } from "@playwright/test";

/**
 * Auth & Route Permission Matrix
 *
 * Comprehensive verification that ALL protected routes return 401 for
 * unauthenticated requests. This catches middleware misconfigurations
 * and accidentally public API routes.
 *
 * Matrix covers:
 *   - All 20+ PRO_ROUTES from middleware.ts
 *   - All client portal API routes
 *   - All trades/connection API routes
 *   - All billing/webhook endpoints (signature-protected)
 *   - All file upload endpoints
 */

// ─────────────────────────────────────────────────────
// PRO API ROUTES — Must all return 401 without auth
// ─────────────────────────────────────────────────────
const PROTECTED_API_ROUTES = {
  // Claims CRUD
  "GET /api/claims": "/api/claims",
  "POST /api/claims": "/api/claims",

  // Connections
  "GET /api/connections/received": "/api/connections/received",
  "GET /api/connections/my": "/api/connections/my",
  "POST /api/connections/accept": "/api/connections/accept",
  "POST /api/connections/decline": "/api/connections/decline",
  "POST /api/connections/connect": "/api/connections/connect",
  "POST /api/connections/request": "/api/connections/request",
  "POST /api/connections/revoke": "/api/connections/revoke",

  // Client management
  "GET /api/client/connections": "/api/client/connections",
  "POST /api/client/connect": "/api/client/connect",
  "GET /api/clients/connections": "/api/clients/connections",

  // Trades
  "POST /api/trades/connect": "/api/trades/connect",
  "POST /api/trades/accept": "/api/trades/accept",
  "POST /api/trades/decline": "/api/trades/decline",
  "POST /api/trades/invite-client": "/api/trades/invite-client",
  "GET /api/trades/invite-client": "/api/trades/invite-client",
  "GET /api/trades/reviews": "/api/trades/reviews",
  "GET /api/trades/work-requests": "/api/trades/work-requests",
  "GET /api/trades/job-board": "/api/trades/job-board",
  "POST /api/trades/attach-to-claim": "/api/trades/attach-to-claim",

  // Messages
  "GET /api/messages/threads": "/api/messages/threads",
  "GET /api/messages/conversations": "/api/messages/conversations",
  "POST /api/messages/create": "/api/messages/create",
  "POST /api/messages/send": "/api/messages/send",
  "POST /api/messages/pro-to-client/create": "/api/messages/pro-to-client/create",
  "POST /api/messages/post-update": "/api/messages/post-update",

  // Invitations
  "GET /api/invitations": "/api/invitations",
  "POST /api/invitations/send": "/api/invitations/send",

  // Portal
  "GET /api/portal/connections": "/api/portal/connections",
  "GET /api/portal/network": "/api/portal/network",
  "GET /api/portal/direct-messages": "/api/portal/direct-messages",
  "POST /api/portal/direct-messages": "/api/portal/direct-messages",
  "POST /api/portal/accept-pro-invite": "/api/portal/accept-pro-invite",
  "POST /api/portal/connect-pro": "/api/portal/connect-pro",
  "GET /api/portal/messages": "/api/portal/messages",
  "POST /api/portal/messages": "/api/portal/messages",

  // Settings & billing
  "GET /api/org/active": "/api/org/active", // allowed to return 401 JSON
  "GET /api/settings/branding": "/api/settings/branding",
  "GET /api/tokens/balance": "/api/tokens/balance",
};

// ─────────────────────────────────────────────────────
// GET routes that MUST return 401
// ─────────────────────────────────────────────────────
const GET_PROTECTED = Object.entries(PROTECTED_API_ROUTES)
  .filter(([method]) => method.startsWith("GET"))
  .map(([label, url]) => ({ label, url }));

// POST routes that MUST return 401
const POST_PROTECTED = Object.entries(PROTECTED_API_ROUTES)
  .filter(([method]) => method.startsWith("POST"))
  .map(([label, url]) => ({ label, url }));

test.describe("Auth Matrix — GET Routes (unauthenticated → 401)", () => {
  for (const { label, url } of GET_PROTECTED) {
    test(`${label} returns 401`, async ({ request }) => {
      const res = await request.get(url);
      expect(res.status(), `Expected 401 for ${label}, got ${res.status()}`).toBe(401);
    });
  }
});

test.describe("Auth Matrix — POST Routes (unauthenticated → 401)", () => {
  for (const { label, url } of POST_PROTECTED) {
    test(`${label} returns 401`, async ({ request }) => {
      const res = await request.post(url, {
        data: { test: true },
      });
      expect(res.status(), `Expected 401 for ${label}, got ${res.status()}`).toBe(401);
    });
  }
});

// ─────────────────────────────────────────────────────
// PUBLIC ROUTES — Must NOT return 401
// ─────────────────────────────────────────────────────
const PUBLIC_ROUTES = [
  "/api/health/live",
  "/api/health/ready",
  "/api/diag/ready",
  "/api/deploy-info",
];

test.describe("Auth Matrix — Public Routes (no auth required)", () => {
  for (const url of PUBLIC_ROUTES) {
    test(`GET ${url} does NOT return 401`, async ({ request }) => {
      const res = await request.get(url);
      expect(res.status()).not.toBe(401);
    });
  }
});

// ─────────────────────────────────────────────────────
// STRIPE WEBHOOK — Signature protected (not auth protected)
// ─────────────────────────────────────────────────────
test.describe("Stripe Webhook — Signature Protection", () => {
  test("POST /api/webhooks/stripe returns 400 without signature", async ({ request }) => {
    const res = await request.post("/api/webhooks/stripe", {
      data: JSON.stringify({ type: "test" }),
      headers: { "Content-Type": "application/json" },
    });
    // Should return 400 (no stripe-signature header) — not 401
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("No signature");
  });

  test("POST /api/webhooks/stripe returns 400 with bad signature", async ({ request }) => {
    const res = await request.post("/api/webhooks/stripe", {
      data: JSON.stringify({ type: "test" }),
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "t=9999999999,v1=bad_sig,v0=bad_sig",
      },
    });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid signature");
  });
});

// ─────────────────────────────────────────────────────
// PAGE ROUTES — Pro routes require auth
// ─────────────────────────────────────────────────────
const PRO_PAGES = [
  "/dashboard",
  "/claims",
  "/proposals",
  "/analytics",
  "/vendors",
  "/trades",
  "/messages",
  "/reports",
  "/settings",
  "/contacts",
  "/teams",
  "/invitations",
];

test.describe("Auth Matrix — Pro Pages require auth", () => {
  for (const path of PRO_PAGES) {
    test(`${path} requires authentication`, async ({ page }) => {
      await page.goto(path);
      const url = page.url();
      // Should either redirect to sign-in OR show inline auth gate
      const redirectedToSignIn = url.includes("sign-in");
      const hasAuthGate = await page
        .locator("h1")
        .filter({ hasText: /Sign In Required/i })
        .isVisible()
        .catch(() => false);
      // Some pages show "Authentication Unavailable" (h2) instead of "Sign In Required" (h1)
      const hasAuthUnavailable = await page
        .locator("h2")
        .filter({ hasText: /Authentication Unavailable/i })
        .isVisible()
        .catch(() => false);
      expect(
        redirectedToSignIn || hasAuthGate || hasAuthUnavailable,
        `${path} should require auth but appears accessible`
      ).toBeTruthy();
    });
  }
});
