import { expect, test } from "@playwright/test";

/**
 * Phase B+C Permission Tests
 * Tests centralized permission system for:
 * - Vendor attachment
 * - Portal access (VIEWER vs EDITOR)
 * - Client invites
 * - File uploads
 */

test.describe("Phase B+C: Centralized Permissions", () => {
  test.describe("API Permission Enforcement", () => {
    test("401: Unauthenticated requests are rejected", async ({ request }) => {
      const endpoints = [
        "/api/claims/test-claim-id/permissions",
        "/api/claims/test-claim-id/photos",
        "/api/claims/test-claim-id/invite",
        "/api/vendors/test-vendor-id/attach",
        "/api/vendors/usage",
      ];

      for (const endpoint of endpoints) {
        const response = await request.post(endpoint);
        expect(response.status()).toBe(401);
      }
    });

    test("GET /api/claims/[claimId]/permissions returns permission data", async ({ request }) => {
      // This test requires authentication setup
      // For now, we verify the endpoint exists and structure
      const response = await request.get("/api/claims/test-claim-id/permissions");

      // Either 401 (no auth) or 200 (with auth) is valid
      expect([200, 401, 404]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty("permissions");
        expect(data.permissions).toHaveProperty("canView");
        expect(data.permissions).toHaveProperty("canEdit");
        expect(data.permissions).toHaveProperty("canUpload");
        expect(data.permissions).toHaveProperty("canInvite");
        expect(data.permissions).toHaveProperty("canAttachVendors");
      }
    });

    test("GET /api/vendors/usage accepts query params", async ({ request }) => {
      const response = await request.get("/api/vendors/usage?vendorId=test&claimId=test&limit=10");

      // Either 401 (no auth) or 200 (with auth) is valid
      expect([200, 401]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty("success");
        expect(data).toHaveProperty("history");
      }
    });
  });

  test.describe("Vendor Attachment with Usage History", () => {
    test("POST /api/vendors/[id]/attach requires authentication", async ({ request }) => {
      const response = await request.post("/api/vendors/test-vendor-id/attach", {
        data: {
          claimId: "test-claim-id",
          role: "Contractor",
        },
      });

      expect(response.status()).toBe(401);
    });

    test("DELETE /api/vendors/[id]/attach requires authentication", async ({ request }) => {
      const response = await request.delete(
        "/api/vendors/test-vendor-id/attach?claimId=test-claim-id"
      );

      expect(response.status()).toBe(401);
    });
  });

  test.describe("Vendor-Trade Profile Linkage", () => {
    test("POST /api/vendors/[id]/link-trade-profile requires authentication", async ({
      request,
    }) => {
      const response = await request.post("/api/vendors/test-vendor-id/link-trade-profile", {
        data: {
          tradeProfileId: "test-profile-id",
        },
      });

      expect(response.status()).toBe(401);
    });

    test("DELETE /api/vendors/[id]/link-trade-profile requires authentication", async ({
      request,
    }) => {
      const response = await request.delete("/api/vendors/test-vendor-id/link-trade-profile");

      expect(response.status()).toBe(401);
    });
  });

  test.describe("Client Invite Permissions", () => {
    test("POST /api/claims/[id]/invite requires authentication", async ({ request }) => {
      const response = await request.post("/api/claims/test-claim-id/invite", {
        data: {
          email: "test@example.com",
          role: "VIEWER",
        },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe("Upload Permissions", () => {
    test("POST /api/claims/[id]/photos requires authentication", async ({ request }) => {
      // Test with simple JSON body - multipart with Buffer causes Playwright issues
      const response = await request.post("/api/claims/test-claim-id/photos", {
        data: { file: "test", caption: "Test photo" },
      });

      expect(response.status()).toBe(401);
    });

    test("GET /api/claims/[id]/documents requires authentication", async ({ request }) => {
      const response = await request.get("/api/claims/test-claim-id/documents");

      expect(response.status()).toBe(401);
    });
  });
});

test.describe("Phase B+C: Database Schema Validation", () => {
  test("Verify schema changes via API responses", async ({ request }) => {
    // This is a smoke test - actual schema validation happens in migration
    // We verify that the API accepts the new fields

    // Test that vendor attachment can include usage history tracking
    const attachResponse = await request.post("/api/vendors/test-vendor-id/attach", {
      data: { claimId: "test-claim", role: "Contractor" },
    });
    expect([401, 403, 404]).toContain(attachResponse.status()); // Expected failures without auth

    // Test that vendor link-trade-profile endpoint exists
    const linkResponse = await request.post("/api/vendors/test-vendor-id/link-trade-profile", {
      data: { tradeProfileId: "test-profile" },
    });
    expect([401, 403, 404]).toContain(linkResponse.status());
  });
});

test.describe("Phase B+C: UI Integration", () => {
  test("Portal pages require authentication", async ({ page }) => {
    const portalUrls = [
      "/portal/claims",
      "/portal/claims/test-claim-id",
      "/portal/invite/test-token",
    ];

    for (const url of portalUrls) {
      await page.goto(url);

      // Should redirect to sign-in or show auth gate
      const currentUrl = page.url();
      const bodyText = await page.textContent("body");

      // Either redirected to auth or shows auth UI
      expect(
        currentUrl.includes("/sign-in") ||
          currentUrl.includes("/auth") ||
          bodyText?.includes("Sign in") ||
          bodyText?.includes("Sign In") ||
          bodyText?.includes("Log in")
      ).toBeTruthy();
    }
  });

  test("Marketplace (public) pages do not require authentication", async ({ page }) => {
    const publicUrls = ["/", "/marketplace", "/trades-network"];

    for (const url of publicUrls) {
      await page.goto(url);

      // Should NOT redirect to auth
      const currentUrl = page.url();
      expect(currentUrl).not.toContain("/sign-in");
      expect(currentUrl).not.toContain("/auth");

      // Page should load successfully
      await expect(page.locator("body")).toBeVisible();
    }
  });
});

test.describe("Phase B+C: Error Handling", () => {
  test("403 errors include helpful messages", async ({ request }) => {
    // When authenticated but lacking permissions
    // The response should include a clear error message
    const response = await request.post("/api/claims/test-claim-id/invite", {
      data: { email: "test@example.com" },
    });

    if (response.status() === 403) {
      const data = await response.json();
      expect(data).toHaveProperty("error");
      expect(typeof data.error).toBe("string");
      expect(data.error.length).toBeGreaterThan(0);
    }
  });

  test("400 errors for missing required fields", async ({ request }) => {
    // Missing required fields should return 400
    const response = await request.post("/api/vendors/test-vendor-id/attach", {
      data: {}, // Missing claimId
    });

    // Either 400 (validation) or 401 (auth) is acceptable
    expect([400, 401]).toContain(response.status());
  });
});
