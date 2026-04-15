/**
 * API Error Helper Tests
 *
 * Verifies the canonical error/success response shapes
 * used by all 130+ API routes.
 */

import { describe, expect, it } from "vitest";

import { apiError, apiOk } from "../apiError";

describe("apiError", () => {
  it("returns correct status code", () => {
    const response = apiError(400, "VALIDATION_ERROR", "Invalid input");
    expect(response.status).toBe(400);
  });

  it("returns correct JSON shape", async () => {
    const response = apiError(401, "UNAUTHENTICATED", "Authentication required");
    const body = await response.json();

    expect(body.error).toBe("Authentication required");
    expect(body.code).toBe("UNAUTHENTICATED");
    expect(body.message).toBe("Authentication required");
  });

  it("includes details when provided", async () => {
    const details = [{ field: "email", message: "Required" }];
    const response = apiError(400, "VALIDATION_ERROR", "Validation failed", details);
    const body = await response.json();

    expect(body.details).toEqual(details);
  });

  it("returns a valid response object", () => {
    const response = apiError(500, "INTERNAL", "Unexpected error");
    expect(response).toBeDefined();
    expect(response.status).toBe(500);
  });

  it("supports common HTTP status codes", () => {
    expect(apiError(400, "BAD_REQUEST", "Bad request").status).toBe(400);
    expect(apiError(401, "UNAUTHORIZED", "Unauthorized").status).toBe(401);
    expect(apiError(403, "FORBIDDEN", "Forbidden").status).toBe(403);
    expect(apiError(404, "NOT_FOUND", "Not found").status).toBe(404);
    expect(apiError(429, "RATE_LIMITED", "Too many requests").status).toBe(429);
    expect(apiError(500, "INTERNAL", "Internal error").status).toBe(500);
  });
});

describe("apiOk", () => {
  it("returns 200 by default", () => {
    const response = apiOk({ data: "test" });
    expect(response.status).toBe(200);
  });

  it("includes ok: true in response", async () => {
    const response = apiOk({ count: 5 });
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.count).toBe(5);
  });

  it("allows custom status code", () => {
    const response = apiOk({ created: true }, { status: 201 });
    expect(response.status).toBe(201);
  });

  it("merges data into response body", async () => {
    const response = apiOk({ items: [1, 2, 3], total: 3 });
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.items).toEqual([1, 2, 3]);
    expect(body.total).toBe(3);
  });
});
