/**
 * ============================================================================
 * withAuth / getRouteParams Unit Tests
 * ============================================================================
 *
 * Tests the declarative API route wrapper and the type-safe route params helper.
 * Covers:
 * 1. withAuth — auth enforcement, role gating, routeContext passthrough
 * 2. withAdmin / withManager — convenience wrappers
 * 3. getRouteParams — Promise unwrapping, missing params, type safety
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock next/server (ESM resolution requires .js extension) ─────────────────
vi.mock("next/server", () => {
  class MockNextRequest {
    url: string;
    method: string;
    headers: Map<string, string>;
    nextUrl: URL;
    constructor(input: string | URL, init?: { headers?: Record<string, string>; method?: string }) {
      const url = typeof input === "string" ? input : input.toString();
      this.url = url;
      this.method = init?.method || "GET";
      this.headers = new Map(Object.entries(init?.headers || {}));
      this.nextUrl = new URL(url);
    }
    json() {
      return Promise.resolve({});
    }
    text() {
      return Promise.resolve("");
    }
  }
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
      return new MockNextResponse(JSON.stringify(data), init);
    }
    static redirect(url: string | URL, status?: number) {
      return new MockNextResponse(null, { status: status || 307 });
    }
    static next() {
      return new MockNextResponse(null, { status: 200 });
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

// Import NextRequest/NextResponse AFTER mock is declared (vitest hoists vi.mock)
import { NextRequest, NextResponse } from "next/server";

// ── Mock server-only ─────────────────────────────────────────────────────────
vi.mock("server-only", () => ({}));

// ── Mock requireAuth ─────────────────────────────────────────────────────────
const mockRequireAuth = vi.fn();
const mockIsAuthError = vi.fn();
vi.mock("@/lib/auth/requireAuth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  isAuthError: (...args: unknown[]) => mockIsAuthError(...args),
}));

// ── Mock requestContext ──────────────────────────────────────────────────────
vi.mock("@/lib/requestContext", () => ({
  setRequestContext: vi.fn(),
}));

// ── Import after mocks ──────────────────────────────────────────────────────
import { getRouteParams, withAdmin, withAuth, withManager } from "@/lib/auth/withAuth";

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function makeRequest(url = "http://localhost:3000/api/test", headers: Record<string, string> = {}) {
  return new NextRequest(new URL(url), { headers });
}

const AUTH_SUCCESS = {
  orgId: "org_test123",
  userId: "user_test456",
  role: "ADMIN",
  membershipId: "mem_test789",
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. withAuth
// ═══════════════════════════════════════════════════════════════════════════════

describe("withAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue(AUTH_SUCCESS);
    mockIsAuthError.mockReturnValue(false);
  });

  it("calls handler with auth context when authenticated", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);

    const req = makeRequest();
    await wrapped(req);

    expect(handler).toHaveBeenCalledWith(req, AUTH_SUCCESS, undefined);
  });

  it("returns auth error response when not authenticated", async () => {
    const errorResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockRequireAuth.mockResolvedValue(errorResponse);
    mockIsAuthError.mockReturnValue(true);

    const handler = vi.fn();
    const wrapped = withAuth(handler);

    const result = await wrapped(makeRequest());

    expect(handler).not.toHaveBeenCalled();
    expect(result).toBe(errorResponse);
  });

  it("passes routeContext through to handler", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);

    const routeContext = { params: { claimId: "claim_abc" } };
    const req = makeRequest();
    await wrapped(req, routeContext);

    expect(handler).toHaveBeenCalledWith(req, AUTH_SUCCESS, routeContext);
  });

  it("passes options to requireAuth", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const options = { roles: ["ADMIN"] as string[] };
    const wrapped = withAuth(handler, options);

    await wrapped(makeRequest());

    expect(mockRequireAuth).toHaveBeenCalledWith(options);
  });

  it("propagates x-request-id header", async () => {
    const { setRequestContext } = await import("@/lib/requestContext");
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);

    const req = makeRequest("http://localhost:3000/api/test", { "x-request-id": "req_abc123" });
    await wrapped(req);

    expect(setRequestContext).toHaveBeenCalledWith("req_abc123");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. withAdmin / withManager
// ═══════════════════════════════════════════════════════════════════════════════

describe("withAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue(AUTH_SUCCESS);
    mockIsAuthError.mockReturnValue(false);
  });

  it("passes ADMIN and OWNER roles to requireAuth", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAdmin(handler);

    await wrapped(makeRequest());

    expect(mockRequireAuth).toHaveBeenCalledWith({ roles: ["ADMIN", "OWNER"] });
  });
});

describe("withManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue(AUTH_SUCCESS);
    mockIsAuthError.mockReturnValue(false);
  });

  it("passes OWNER, ADMIN, MANAGER roles to requireAuth", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withManager(handler);

    await wrapped(makeRequest());

    expect(mockRequireAuth).toHaveBeenCalledWith({ roles: ["OWNER", "ADMIN", "MANAGER"] });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. getRouteParams
// ═══════════════════════════════════════════════════════════════════════════════

describe("getRouteParams", () => {
  it("extracts sync params from route context", async () => {
    const context = { params: { claimId: "claim_123" } };
    const result = await getRouteParams<{ claimId: string }>(context);

    expect(result).toEqual({ claimId: "claim_123" });
  });

  it("unwraps Promise params from route context", async () => {
    const context = { params: Promise.resolve({ claimId: "claim_456", noteId: "note_789" }) };
    const result = await getRouteParams<{ claimId: string; noteId: string }>(context);

    expect(result).toEqual({ claimId: "claim_456", noteId: "note_789" });
  });

  it("throws when route context is undefined", async () => {
    await expect(getRouteParams(undefined)).rejects.toThrow("Missing route params");
  });

  it("throws when route context has no params", async () => {
    await expect(getRouteParams({})).rejects.toThrow("Missing route params");
  });

  it("throws when route context is null", async () => {
    await expect(getRouteParams(null)).rejects.toThrow("Missing route params");
  });
});
