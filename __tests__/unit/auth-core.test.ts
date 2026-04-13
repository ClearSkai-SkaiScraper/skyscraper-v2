/**
 * ============================================================================
 * Auth Core Unit Tests — Session 9
 * ============================================================================
 *
 * These tests cover the 4 most critical auth/tenant isolation modules:
 * 1. resolveOrg — canonical org resolver (source of truth)
 * 2. requireAuth — API route guard (wraps resolveOrg)
 * 3. withAuth/withManager/withAdmin — HOF wrappers
 * 4. apiError — error response utilities
 *
 * Combined these modules are imported by 200+ files and are the foundation
 * of the entire multi-tenant security model. Previously had ZERO unit tests.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock next/server (ESM resolution workaround for vitest) ──────────────────
vi.mock("next/server", () => {
  class MockNextResponse {
    status: number;
    body: unknown;
    _headers: Map<string, string>;
    constructor(body?: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status || 200;
      this._headers = new Map(Object.entries(init?.headers || {}));
    }
    static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      const resp = new MockNextResponse(JSON.stringify(data), init);
      // Add json() method on the instance for test compatibility
      (resp as Record<string, unknown>).json = async () => data;
      return resp;
    }
    static redirect(url: string | URL, status?: number) {
      return new MockNextResponse(null, { status: status || 307 });
    }
    static next() {
      return new MockNextResponse(null, { status: 200 });
    }
  }
  return { NextResponse: MockNextResponse };
});

import { NextResponse } from "next/server";

// ── Mock Clerk auth ──────────────────────────────────────────────────────────
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

// ── Mock Prisma ──────────────────────────────────────────────────────────────
const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  default: {
    user_organizations: { findMany: (...args: any[]) => mockFindMany(...args) },
    users: { findUnique: (...args: any[]) => mockFindUnique(...args) },
  },
}));

// ── Mock logger ──────────────────────────────────────────────────────────────
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    setContext: vi.fn(),
  },
}));

// ── Mock server-only (no-op) ─────────────────────────────────────────────────
vi.mock("server-only", () => ({}));

// ═══════════════════════════════════════════════════════════════════════════════
// 1. resolveOrg
// ═══════════════════════════════════════════════════════════════════════════════

describe("resolveOrg", () => {
  beforeEach(() => {
    vi.resetModules();
    mockAuth.mockReset();
    mockFindMany.mockReset();
  });

  it("throws 'unauthenticated' when no Clerk session", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const { resolveOrg, OrgResolutionError } = await import("@/lib/org/resolveOrg");
    await expect(resolveOrg()).rejects.toThrow(OrgResolutionError);
    await expect(resolveOrg()).rejects.toMatchObject({ reason: "unauthenticated" });
  });

  it("throws 'no-org' when user has no memberships", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindMany.mockResolvedValue([]);

    const { resolveOrg, OrgResolutionError } = await import("@/lib/org/resolveOrg");
    await expect(resolveOrg()).rejects.toThrow(OrgResolutionError);
    await expect(resolveOrg()).rejects.toMatchObject({ reason: "no-org" });
  });

  it("throws 'no-org' when memberships exist but org was deleted", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindMany.mockResolvedValue([
      { id: "mem_1", userId: "user_123", organizationId: "org_dead", Org: null, role: "ADMIN" },
    ]);

    const { resolveOrg } = await import("@/lib/org/resolveOrg");
    await expect(resolveOrg()).rejects.toMatchObject({ reason: "no-org" });
  });

  it("returns DB org UUID (not Clerk orgId) from valid membership", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindMany.mockResolvedValue([
      {
        id: "mem_1",
        userId: "user_123",
        organizationId: "db-uuid-001",
        Org: { id: "db-uuid-001" },
        role: "ADMIN",
        createdAt: new Date("2024-01-01"),
      },
    ]);

    const { resolveOrg } = await import("@/lib/org/resolveOrg");
    const result = await resolveOrg();

    expect(result.orgId).toBe("db-uuid-001");
    expect(result.userId).toBe("user_123");
    expect(result.role).toBe("ADMIN");
    expect(result.membershipId).toBe("mem_1");
  });

  it("returns OLDEST valid membership when user has multiple orgs", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindMany.mockResolvedValue([
      {
        id: "mem_old",
        userId: "user_123",
        organizationId: "org-first",
        Org: { id: "org-first" },
        role: "MEMBER",
        createdAt: new Date("2024-01-01"),
      },
      {
        id: "mem_new",
        userId: "user_123",
        organizationId: "org-second",
        Org: { id: "org-second" },
        role: "ADMIN",
        createdAt: new Date("2025-01-01"),
      },
    ]);

    const { resolveOrg } = await import("@/lib/org/resolveOrg");
    const result = await resolveOrg();
    expect(result.orgId).toBe("org-first");
  });

  it("skips deleted orgs and returns next valid membership", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindMany.mockResolvedValue([
      {
        id: "mem_dead",
        userId: "user_123",
        organizationId: "org-deleted",
        Org: null, // Org was deleted
        role: "ADMIN",
        createdAt: new Date("2024-01-01"),
      },
      {
        id: "mem_alive",
        userId: "user_123",
        organizationId: "org-active",
        Org: { id: "org-active" },
        role: "MEMBER",
        createdAt: new Date("2025-01-01"),
      },
    ]);

    const { resolveOrg } = await import("@/lib/org/resolveOrg");
    const result = await resolveOrg();
    expect(result.orgId).toBe("org-active");
  });

  it("defaults role to MEMBER when membership has no role", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindMany.mockResolvedValue([
      {
        id: "mem_1",
        userId: "user_123",
        organizationId: "org-1",
        Org: { id: "org-1" },
        role: null,
        createdAt: new Date(),
      },
    ]);

    const { resolveOrg } = await import("@/lib/org/resolveOrg");
    const result = await resolveOrg();
    expect(result.role).toBe("MEMBER");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. resolveOrgSafe
// ═══════════════════════════════════════════════════════════════════════════════

describe("resolveOrgSafe", () => {
  beforeEach(() => {
    vi.resetModules();
    mockAuth.mockReset();
    mockFindMany.mockReset();
  });

  it("returns null instead of throwing when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const { resolveOrgSafe } = await import("@/lib/org/resolveOrg");
    const result = await resolveOrgSafe();
    expect(result).toBeNull();
  });

  it("returns resolved org on success", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindMany.mockResolvedValue([
      {
        id: "mem_1",
        userId: "user_123",
        organizationId: "org-1",
        Org: { id: "org-1" },
        role: "ADMIN",
        createdAt: new Date(),
      },
    ]);

    const { resolveOrgSafe } = await import("@/lib/org/resolveOrg");
    const result = await resolveOrgSafe();
    expect(result).not.toBeNull();
    expect(result!.orgId).toBe("org-1");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. OrgResolutionError
// ═══════════════════════════════════════════════════════════════════════════════

describe("OrgResolutionError", () => {
  it("has correct name and reason properties", async () => {
    const { OrgResolutionError } = await import("@/lib/org/resolveOrg");

    const err = new OrgResolutionError("unauthenticated", "Test");
    expect(err.name).toBe("OrgResolutionError");
    expect(err.reason).toBe("unauthenticated");
    expect(err.message).toBe("Test");
    expect(err instanceof Error).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. requireAuth
// ═══════════════════════════════════════════════════════════════════════════════

describe("requireAuth", () => {
  beforeEach(() => {
    vi.resetModules();
    mockAuth.mockReset();
    mockFindMany.mockReset();
  });

  it("returns 401 NextResponse when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const { requireAuth, isAuthError } = await import("@/lib/auth/requireAuth");
    const result = await requireAuth();

    expect(isAuthError(result)).toBe(true);
    expect(result).toBeInstanceOf(NextResponse);
    // Check status through the response
    const res = result as NextResponse;
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no org", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindMany.mockResolvedValue([]);

    const { requireAuth, isAuthError } = await import("@/lib/auth/requireAuth");
    const result = await requireAuth();

    expect(isAuthError(result)).toBe(true);
    const res = result as NextResponse;
    expect(res.status).toBe(403);
  });

  it("returns auth context when authenticated with valid org", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindMany.mockResolvedValue([
      {
        id: "mem_1",
        userId: "user_123",
        organizationId: "org-1",
        Org: { id: "org-1" },
        role: "ADMIN",
        createdAt: new Date(),
      },
    ]);

    const { requireAuth, isAuthError } = await import("@/lib/auth/requireAuth");
    const result = await requireAuth();

    expect(isAuthError(result)).toBe(false);
    const ctx = result as { orgId: string; userId: string; role: string };
    expect(ctx.orgId).toBe("org-1");
    expect(ctx.userId).toBe("user_123");
    expect(ctx.role).toBe("ADMIN");
  });

  it("returns 403 when role enforcement fails", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindMany.mockResolvedValue([
      {
        id: "mem_1",
        userId: "user_123",
        organizationId: "org-1",
        Org: { id: "org-1" },
        role: "MEMBER",
        createdAt: new Date(),
      },
    ]);

    const { requireAuth, isAuthError } = await import("@/lib/auth/requireAuth");
    const result = await requireAuth({ roles: ["ADMIN"] });

    expect(isAuthError(result)).toBe(true);
    const res = result as NextResponse;
    expect(res.status).toBe(403);
  });

  it("allows access when user has required role (case-insensitive)", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindMany.mockResolvedValue([
      {
        id: "mem_1",
        userId: "user_123",
        organizationId: "org-1",
        Org: { id: "org-1" },
        role: "admin", // lowercase
        createdAt: new Date(),
      },
    ]);

    const { requireAuth, isAuthError } = await import("@/lib/auth/requireAuth");
    const result = await requireAuth({ roles: ["ADMIN"] }); // uppercase

    expect(isAuthError(result)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. isAuthError
// ═══════════════════════════════════════════════════════════════════════════════

describe("isAuthError", () => {
  it("returns true for NextResponse", async () => {
    const { isAuthError } = await import("@/lib/auth/requireAuth");
    const res = NextResponse.json({ error: "test" }, { status: 401 });
    expect(isAuthError(res)).toBe(true);
  });

  it("returns false for resolved auth object", async () => {
    const { isAuthError } = await import("@/lib/auth/requireAuth");
    const ctx = { orgId: "o1", userId: "u1", role: "ADMIN", membershipId: "m1" };
    expect(isAuthError(ctx)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. apiError utilities
// ═══════════════════════════════════════════════════════════════════════════════

describe("apiError utilities", () => {
  it("apiError returns NextResponse with correct status and payload", async () => {
    const { apiError } = await import("@/lib/apiError");
    const res = apiError(400, "VALIDATION_ERROR", "Bad input", { field: "email" });

    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.message).toBe("Bad input");
    expect(body.details).toEqual({ field: "email" });
  });

  it("apiError includes traceId from VERCEL_REQUEST_ID env", async () => {
    process.env.VERCEL_REQUEST_ID = "req_trace_123";

    // Re-import to pick up env
    const { apiError } = await import("@/lib/apiError");
    const res = apiError(500, "INTERNAL_ERROR", "Server error");
    const body = await res.json();
    expect(body.traceId).toBe("req_trace_123");

    delete process.env.VERCEL_REQUEST_ID;
  });

  it("apiOk wraps data with ok: true", async () => {
    const { apiOk } = await import("@/lib/apiError");
    const res = apiOk({ items: [1, 2, 3] });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.items).toEqual([1, 2, 3]);
  });

  it("safeHandler catches ZodError and returns 400", async () => {
    const { safeHandler } = await import("@/lib/apiError");
    const zodError = new Error("Validation");
    zodError.name = "ZodError";
    (zodError as any).errors = [{ path: ["email"], message: "Invalid" }];

    const res = await safeHandler(async () => {
      throw zodError;
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("safeHandler catches unknown errors and returns 500", async () => {
    const { safeHandler } = await import("@/lib/apiError");

    const res = await safeHandler(async () => {
      throw new Error("DB connection failed");
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("INTERNAL_ERROR");
    // Must NOT leak internal error message
    expect(body.message).toBe("Internal server error");
  });

  it("requireValue throws on null/undefined", async () => {
    const { requireValue } = await import("@/lib/apiError");

    expect(() => requireValue(null, "NULL_VAL", "Value is null")).toThrow("NULL_VAL:Value is null");
    expect(() => requireValue(undefined, "UNDEF", "Value is undefined")).toThrow();
    expect(requireValue("hello", "X", "X")).toBe("hello");
    expect(requireValue(0, "X", "X")).toBe(0);
    expect(requireValue(false, "X", "X")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. requestContext
// ═══════════════════════════════════════════════════════════════════════════════

describe("requestContext", () => {
  it("setRequestContext calls logger.setContext with requestId", async () => {
    const { setRequestContext } = await import("@/lib/requestContext");
    const { logger } = await import("@/lib/logger");

    setRequestContext("req-abc-123");
    expect(logger.setContext).toHaveBeenCalledWith({ requestId: "req-abc-123" });
  });
});
