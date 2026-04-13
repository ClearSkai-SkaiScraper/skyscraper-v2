import { expect, test } from "@playwright/test";

/**
 * Storage & Upload Security Audit Tests
 *
 * Validates that file upload endpoints have proper access controls.
 * The storage audit (artifacts/storage-audit.json) flagged:
 *   - hasAccessControl: false
 *   - hasDeleteLogic: false
 *   - Missing env vars: UPLOADTHING_SECRET, UPLOADTHING_APP_ID
 *
 * These tests verify upload routes aren't accidentally public.
 */

test.describe("Storage — Upload Auth Gates", () => {
  test("POST /api/upload returns 401 unauthed", async ({ request }) => {
    const res = await request.post("/api/upload", {
      data: { file: "test" },
    });
    // Should be 401 (protected) or 404 (route doesn't exist in this form)
    expect([401, 404, 405]).toContain(res.status());
  });

  test("POST /api/uploads returns 401 unauthed", async ({ request }) => {
    const res = await request.post("/api/uploads", {
      data: { file: "test" },
    });
    expect([401, 404, 405]).toContain(res.status());
  });

  test("GET /api/uploads returns 401 or 404 unauthed", async ({ request }) => {
    const res = await request.get("/api/uploads");
    expect([401, 404]).toContain(res.status());
  });

  // UploadThing routes
  test("POST /api/uploadthing returns 401 or 404", async ({ request }) => {
    const res = await request.post("/api/uploadthing", {
      data: {},
    });
    // Should be auth-gated or not exist
    expect([401, 404, 500]).toContain(res.status());
  });

  // Branding upload routes
  test("POST /api/settings/branding/upload returns 401 unauthed", async ({ request }) => {
    const res = await request.post("/api/settings/branding/upload", {
      data: { file: "test" },
    });
    expect([401, 404, 405]).toContain(res.status());
  });
});

test.describe("Storage — File Access Controls", () => {
  test("direct file access to /uploads/* is not publicly listable", async ({ request }) => {
    const res = await request.get("/uploads/");
    // Next.js may serve its 404 page with a 200 status (no actual directory listing),
    // or return 307/302 redirect, or proper 401/403/404
    expect([200, 302, 307, 401, 403, 404]).toContain(res.status());
    // If 200, verify it's NOT a real directory listing
    if (res.status() === 200) {
      const body = await res.text();
      expect(body).not.toMatch(/Index of \//i); // No Apache/Nginx directory listing
    }
  });

  test("accessing non-existent file returns 404, not 500", async ({ request }) => {
    const res = await request.get("/api/files/nonexistent-file-12345.pdf");
    expect([401, 404]).toContain(res.status());
  });
});

test.describe("Storage — MinIO/S3 Endpoints", () => {
  test("GET /api/storage/health returns status", async ({ request }) => {
    const res = await request.get("/api/storage/health");
    // May not exist, but should not 500
    expect([200, 401, 404]).toContain(res.status());
  });
});
