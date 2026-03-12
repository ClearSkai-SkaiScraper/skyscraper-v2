import { expect, test } from "@playwright/test";

/**
 * Security Smoke Tests — Auth Gate Verification
 *
 * These tests verify that critical API endpoints properly reject
 * unauthenticated requests. Run against a live (or TEST_AUTH_BYPASS) server.
 *
 * Every destructive endpoint (DELETE, POST mutations) must return 401
 * when called without authentication.
 */

test.describe("Critical DELETE Endpoints — Auth Gates", () => {
  const DELETE_ROUTES = [
    { path: "/api/vin/cart?cartId=fake-id", label: "vin/cart (cart)" },
    { path: "/api/vin/cart?itemId=fake-id", label: "vin/cart (item)" },
    { path: "/api/appointments/fake-id", label: "appointments/[id]" },
    { path: "/api/work-orders/fake-id", label: "work-orders/[id]" },
    { path: "/api/materials/estimates?id=fake-id", label: "materials/estimates" },
    { path: "/api/invoices/fake-id", label: "invoices/[id]" },
    { path: "/api/estimates/fake-id", label: "estimates/[id]" },
    { path: "/api/notifications/fake-id", label: "notifications/[id]" },
  ];

  for (const { path, label } of DELETE_ROUTES) {
    test(`DELETE ${label} returns 401 unauthed`, async ({ request }) => {
      const res = await request.delete(path);
      expect(res.status(), `${label} should reject unauthenticated DELETE`).toBe(401);
    });
  }
});

test.describe("Critical Mutation Endpoints — Auth Gates", () => {
  test("POST /api/org/nuclear-reset returns 401 unauthed", async ({ request }) => {
    const res = await request.post("/api/org/nuclear-reset", {
      data: { confirm: "RESET_MY_ORG" },
    });
    expect(res.status()).toBe(401);
  });

  test("PUT /api/vin/cart returns 401 unauthed", async ({ request }) => {
    const res = await request.put("/api/vin/cart", {
      data: { itemId: "fake-id", quantity: 5 },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/vin/cart returns 401 unauthed", async ({ request }) => {
    const res = await request.post("/api/vin/cart", {
      data: { action: "create_cart", name: "Test" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/video-reports/fake-id/share returns 401 unauthed", async ({ request }) => {
    const res = await request.post("/api/video-reports/fake-id/share");
    expect(res.status()).toBe(401);
  });

  test("POST /api/video-reports/fake-id/revoke returns 401 unauthed", async ({ request }) => {
    const res = await request.post("/api/video-reports/fake-id/revoke");
    expect(res.status()).toBe(401);
  });

  test("PATCH /api/invoices/fake-id returns 401 unauthed", async ({ request }) => {
    const res = await request.patch("/api/invoices/fake-id", {
      data: { action: "void" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Pro Dashboard Pages — Auth Required", () => {
  const PRO_PAGES = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/claims", label: "Claims" },
    { path: "/estimates", label: "Estimates" },
    { path: "/invoices", label: "Invoices" },
    { path: "/materials", label: "Materials" },
    { path: "/settings", label: "Settings" },
    { path: "/team", label: "Team" },
  ];

  for (const { path, label } of PRO_PAGES) {
    test(`${label} (${path}) does not return 500`, async ({ page }) => {
      const response = await page.goto(path);
      const status = response?.status() ?? 0;
      expect(status, `${path} returned server error`).not.toBe(500);
    });
  }
});

test.describe("Portal Pages — Auth Required", () => {
  const PORTAL_API_ROUTES = [
    { path: "/api/portal/claims", label: "portal/claims" },
    { path: "/api/portal/connections", label: "portal/connections" },
    { path: "/api/portal/network", label: "portal/network" },
    { path: "/api/portal/direct-messages", label: "portal/direct-messages" },
    { path: "/api/portal/invitations", label: "portal/invitations" },
  ];

  for (const { path, label } of PORTAL_API_ROUTES) {
    test(`GET ${label} returns 401 unauthed`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(401);
    });
  }
});

test.describe("Health Endpoints — Always Accessible", () => {
  test("/api/health/live returns 200", async ({ request }) => {
    const res = await request.get("/api/health/live");
    expect(res.status()).toBe(200);
  });
});
