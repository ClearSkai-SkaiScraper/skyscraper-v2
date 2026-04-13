import { expect, test } from "@playwright/test";

/**
 * Org-Scoped Data Isolation Tests
 * ────────────────────────────────
 * Validates that multi-tenant org boundaries are enforced:
 *   - API responses never leak data from another org
 *   - Org-scoped endpoints reject requests without org context
 *   - Cross-org access attempts are blocked
 *
 * The test auth bypass sets:
 *   TEST_AUTH_ORG_ID = 11111111-1111-1111-1111-111111111111
 * All responses should be scoped to that org or empty.
 */

const BASE = "/api";

// Endpoints that return org-scoped data
const ORG_SCOPED_ENDPOINTS = [
  { path: `${BASE}/connections`, method: "GET" },
  { path: `${BASE}/connections/received`, method: "GET" },
  { path: `${BASE}/clients/connections`, method: "GET" },
  { path: `${BASE}/invitations`, method: "GET" },
  { path: `${BASE}/messages/threads`, method: "GET" },
  { path: `${BASE}/messages/conversations`, method: "GET" },
  { path: `${BASE}/work-requests`, method: "GET" },
  { path: `${BASE}/job-board`, method: "GET" },
  { path: `${BASE}/claims`, method: "GET" },
  { path: `${BASE}/vendors`, method: "GET" },
  { path: `${BASE}/leads`, method: "GET" },
  { path: `${BASE}/contacts`, method: "GET" },
  { path: `${BASE}/teams`, method: "GET" },
];

// A fake org ID that should never match real data
const FOREIGN_ORG_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const VALID_ORG_ID = "11111111-1111-1111-1111-111111111111";

test.describe("Org-Scoped Data Isolation", () => {
  test.describe("Org-scoped GET endpoints return scoped data", () => {
    for (const { path, method } of ORG_SCOPED_ENDPOINTS) {
      test(`${method} ${path} → scoped to test org`, async ({ request }) => {
        const res = await request.get(path);
        // Should return 200 or empty 200 (no data for test org)
        // Should NOT return 500 (that would mean org scoping is broken)
        expect(res.status()).not.toBe(500);

        if (res.status() === 200) {
          const contentType = res.headers()["content-type"] || "";
          if (contentType.includes("application/json")) {
            const body = await res.json();
            // If array response, verify it's an array (could be empty)
            if (Array.isArray(body)) {
              // Verify no items have a foreign org id
              for (const item of body) {
                if (item.organizationId) {
                  expect(item.organizationId).toBe(VALID_ORG_ID);
                }
                if (item.orgId) {
                  expect(item.orgId).toBe(VALID_ORG_ID);
                }
              }
            }
            // If object with data array
            if (body.data && Array.isArray(body.data)) {
              for (const item of body.data) {
                if (item.organizationId) {
                  expect(item.organizationId).toBe(VALID_ORG_ID);
                }
              }
            }
          }
        }
      });
    }
  });

  test.describe("Cross-org header injection is rejected or ignored", () => {
    // Attempt to send a different org ID in headers — should be ignored
    // because the auth layer should pull org from the session, not headers
    const INJECTION_ENDPOINTS = [`${BASE}/connections`, `${BASE}/claims`, `${BASE}/vendors`];

    for (const path of INJECTION_ENDPOINTS) {
      test(`GET ${path} with forged x-org-id header → no cross-org leak`, async ({ request }) => {
        const res = await request.get(path, {
          headers: { "x-org-id": FOREIGN_ORG_ID },
        });

        // Should still return data scoped to test org, NOT foreign org
        expect(res.status()).not.toBe(500);

        if (res.status() === 200) {
          const contentType = res.headers()["content-type"] || "";
          if (contentType.includes("application/json")) {
            const body = await res.json();
            const items = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : [];
            for (const item of items) {
              if (item.organizationId) {
                expect(item.organizationId).not.toBe(FOREIGN_ORG_ID);
              }
            }
          }
        }
      });
    }
  });

  test.describe("POST endpoints reject cross-org writes", () => {
    test("POST /api/connections with foreign org context → no cross-org creation", async ({
      request,
    }) => {
      // This should either use the session org (test org) or fail —
      // it should never create a record in a foreign org
      const res = await request.post(`${BASE}/connections`, {
        data: {
          clientId: "nonexistent-client",
          organizationId: FOREIGN_ORG_ID,
        },
      });
      // Should fail (401 auth, 400 validation, 404 not found, etc.)
      // but should NOT succeed with the foreign org (never 200/201)
      expect([400, 401, 404, 422, 500]).toContain(res.status());
    });

    test("POST /api/work-requests with foreign org → rejected", async ({ request }) => {
      const res = await request.post(`${BASE}/work-requests`, {
        data: {
          title: "Cross-org test",
          organizationId: FOREIGN_ORG_ID,
        },
      });
      // 401 = auth required, 400/422 = validation, 404 = not found
      expect([400, 401, 404, 422, 500]).toContain(res.status());
    });
  });

  test.describe("Org isolation on page routes", () => {
    test("Dashboard shows only test org data", async ({ page }) => {
      await page.goto("/pro/trades");
      // Should not see "foreign-org" text anywhere
      const bodyText = await page.textContent("body");
      expect(bodyText).not.toContain(FOREIGN_ORG_ID);
    });
  });
});
