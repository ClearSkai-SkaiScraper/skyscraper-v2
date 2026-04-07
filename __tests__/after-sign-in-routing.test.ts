/**
 * TEST — After-sign-in routing logic
 *
 * Tests the server component that resolves user identity and routes
 * to the correct surface (/dashboard for pro, /portal for client).
 *
 * Key scenarios:
 *   1. MODE OVERRIDE: mode=client overrides stale "pro" in Clerk metadata
 *   2. MODE OVERRIDE: mode=pro overrides stale "client" in Clerk metadata
 *   3. L1 resolution: Clerk publicMetadata resolves correctly
 *   4. L1 miss → L2 fallback: direct Clerk API
 *   5. L3 fallback: org membership = pro
 *   6. New user with mode=pro → registered as pro → /dashboard
 *   7. New user with mode=client → registered as client → /portal
 *   8. New user with no mode → defaults to pro → /dashboard
 *   9. Pending redirect honored
 *
 * REGRESSION GUARD for: "Client sign-in routes to Pro side" bug (fixed in a4f66c2)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ------------------------------------------------------------------ */
/*  Shared mock state                                                  */
/* ------------------------------------------------------------------ */
let mockCurrentUserReturn: any = null;
let mockCookieStore: Record<string, string> = {};
let redirectCalledWith: string | null = null;
let clerkUpdateMetadataCalls: any[] = [];
let mockPrismaExecuteRawCalls: any[] = [];
let mockPrismaQueryRawReturn: any[] = [];
let mockFetchReturn: any = null;

/* ------------------------------------------------------------------ */
/*  Mock: @clerk/nextjs/server                                         */
/* ------------------------------------------------------------------ */
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(async () => mockCurrentUserReturn),
  clerkClient: vi.fn(async () => ({
    users: {
      updateUserMetadata: vi.fn(async (...args: any[]) => {
        clerkUpdateMetadataCalls.push(args);
      }),
    },
  })),
}));

/* ------------------------------------------------------------------ */
/*  Mock: next/headers (cookies)                                       */
/* ------------------------------------------------------------------ */
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: (name: string, value: string, _opts?: any) => {
      mockCookieStore[name] = value;
    },
    get: (name: string) => {
      const val = mockCookieStore[name];
      return val ? { value: val } : undefined;
    },
  })),
}));

/* ------------------------------------------------------------------ */
/*  Mock: next/navigation (redirect)                                   */
/* ------------------------------------------------------------------ */
class RedirectError extends Error {
  digest: string;
  constructor(url: string) {
    super(`NEXT_REDIRECT:${url}`);
    this.digest = `NEXT_REDIRECT;replace;${url};307`;
    redirectCalledWith = url;
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url);
  }),
}));

/* ------------------------------------------------------------------ */
/*  Mock: @/lib/logger                                                 */
/* ------------------------------------------------------------------ */
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

/* ------------------------------------------------------------------ */
/*  Mock: @/lib/prisma                                                 */
/* ------------------------------------------------------------------ */
vi.mock("@/lib/prisma", () => ({
  default: {
    $executeRawUnsafe: vi.fn(async (...args: any[]) => {
      mockPrismaExecuteRawCalls.push(args);
      return 1;
    }),
    $queryRawUnsafe: vi.fn(async () => mockPrismaQueryRawReturn),
    // Source uses Prisma.sql tagged templates with $executeRaw / $queryRaw
    $executeRaw: vi.fn(async (...args: any[]) => {
      mockPrismaExecuteRawCalls.push(args);
      return 1;
    }),
    $queryRaw: vi.fn(async () => mockPrismaQueryRawReturn),
  },
}));

/* ------------------------------------------------------------------ */
/*  Mock: @/lib/identity                                               */
/* ------------------------------------------------------------------ */
vi.mock("@/lib/identity", () => ({
  getUserIdentity: vi.fn(async () => null),
}));

/* ------------------------------------------------------------------ */
/*  Mock: @prisma/client (Prisma.sql tagged template)                  */
/* ------------------------------------------------------------------ */
vi.mock("@prisma/client", () => ({
  Prisma: {
    sql(strings: TemplateStringsArray, ...values: unknown[]) {
      return { strings: [...strings], values };
    },
  },
}));

/* ------------------------------------------------------------------ */
/*  Mock: global fetch (for Clerk REST API L2)                         */
/* ------------------------------------------------------------------ */
const originalFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = vi.fn(async () => {
    if (mockFetchReturn) return mockFetchReturn;
    return { ok: false, status: 500 } as Response;
  }) as any;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function makeUser(
  overrides?: Partial<{
    id: string;
    publicMetadata: Record<string, unknown>;
    organizationMemberships: any[];
    firstName: string;
    lastName: string;
    emailAddresses: { emailAddress: string }[];
    imageUrl: string;
  }>
) {
  return {
    id: overrides?.id ?? "user_test_123",
    publicMetadata: overrides?.publicMetadata ?? {},
    organizationMemberships: overrides?.organizationMemberships ?? [],
    firstName: overrides?.firstName ?? "Test",
    lastName: overrides?.lastName ?? "User",
    emailAddresses: overrides?.emailAddresses ?? [{ emailAddress: "test@example.com" }],
    imageUrl: overrides?.imageUrl ?? "https://img.clerk.com/test.jpg",
  };
}

async function callAfterSignIn(params: { mode?: string; redirect_url?: string }) {
  // Dynamic import to ensure mocks are applied
  const mod = await import("../../src/app/(auth)/after-sign-in/page");
  const AfterSignInPage = mod.default;

  redirectCalledWith = null;

  try {
    await AfterSignInPage({ searchParams: Promise.resolve(params) });
  } catch (e: any) {
    if (e instanceof RedirectError) {
      return redirectCalledWith;
    }
    throw e;
  }

  // If no redirect was thrown, something went wrong
  return null;
}

/* ------------------------------------------------------------------ */
/*  Setup / Teardown                                                   */
/* ------------------------------------------------------------------ */
describe("after-sign-in page routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUserReturn = null;
    mockCookieStore = {};
    redirectCalledWith = null;
    clerkUpdateMetadataCalls = [];
    mockPrismaExecuteRawCalls = [];
    mockPrismaQueryRawReturn = [];
    mockFetchReturn = null;
    // Ensure CLERK_SECRET_KEY is set for L2
    process.env.CLERK_SECRET_KEY = "sk_test_fake";
  });

  // ===============================================================
  // UNAUTHENTICATED → /sign-in
  // ===============================================================
  describe("Unauthenticated user", () => {
    it("redirects to /sign-in when currentUser() returns null", async () => {
      mockCurrentUserReturn = null;
      const dest = await callAfterSignIn({});
      expect(dest).toBe("/sign-in");
    });

    it("redirects to /sign-in when currentUser() returns user with no id", async () => {
      mockCurrentUserReturn = { id: null };
      const dest = await callAfterSignIn({});
      expect(dest).toBe("/sign-in");
    });
  });

  // ===============================================================
  // MODE OVERRIDE (CRITICAL — this is the bug fix regression guard)
  // ===============================================================
  describe("Mode override — CRITICAL regression guard", () => {
    it("mode=client overrides stale 'pro' in Clerk publicMetadata → /portal", async () => {
      // Setup: user has userType=pro in Clerk metadata (stale from previous pro session)
      mockCurrentUserReturn = makeUser({
        publicMetadata: { userType: "pro" },
      });

      const dest = await callAfterSignIn({ mode: "client" });

      // MUST go to /portal, NOT /dashboard
      expect(dest).toBe("/portal");
      // Cookie must be set to "client"
      expect(mockCookieStore["x-user-type"]).toBe("client");
      // Clerk metadata must be synced to "client"
      expect(clerkUpdateMetadataCalls.length).toBeGreaterThan(0);
      expect(clerkUpdateMetadataCalls[0][1]).toEqual({
        publicMetadata: { userType: "client" },
      });
    });

    it("mode=pro overrides stale 'client' in Clerk publicMetadata → /dashboard", async () => {
      mockCurrentUserReturn = makeUser({
        publicMetadata: { userType: "client" },
      });

      const dest = await callAfterSignIn({ mode: "pro" });

      expect(dest).toBe("/dashboard");
      expect(mockCookieStore["x-user-type"]).toBe("pro");
      expect(clerkUpdateMetadataCalls[0][1]).toEqual({
        publicMetadata: { userType: "pro" },
      });
    });

    it("mode=client with pending redirect → honors redirect_url", async () => {
      mockCurrentUserReturn = makeUser({
        publicMetadata: { userType: "pro" },
      });

      const dest = await callAfterSignIn({
        mode: "client",
        redirect_url: "/portal/claims/abc-123",
      });

      // Pending redirect takes priority over default /portal
      expect(dest).toBe("/portal/claims/abc-123");
      expect(mockCookieStore["x-user-type"]).toBe("client");
    });

    it("mode=pro with pending redirect → honors redirect_url", async () => {
      mockCurrentUserReturn = makeUser({
        publicMetadata: { userType: "client" },
      });

      const dest = await callAfterSignIn({
        mode: "pro",
        redirect_url: "/trades/join?token=abc",
      });

      expect(dest).toBe("/trades/join?token=abc");
      expect(mockCookieStore["x-user-type"]).toBe("pro");
    });

    it("mode=client also updates DB user_registry", async () => {
      mockCurrentUserReturn = makeUser({
        publicMetadata: { userType: "pro" },
      });

      await callAfterSignIn({ mode: "client" });

      // Should have called $executeRaw to upsert user_registry
      expect(mockPrismaExecuteRawCalls.length).toBeGreaterThan(0);
      const call = mockPrismaExecuteRawCalls[0];
      // $executeRaw receives a Prisma.sql tagged template with .values array
      const taggedResult = call[0];
      expect(taggedResult.values).toContain("user_test_123"); // clerkUserId
      expect(taggedResult.values).toContain("client"); // userType
    });
  });

  // ===============================================================
  // L1: Clerk publicMetadata (no mode param — existing user)
  // ===============================================================
  describe("L1: Clerk publicMetadata resolution", () => {
    it("existing pro user (L1 hit) → /dashboard", async () => {
      mockCurrentUserReturn = makeUser({
        publicMetadata: { userType: "pro" },
      });

      const dest = await callAfterSignIn({});

      expect(dest).toBe("/dashboard");
      expect(mockCookieStore["x-user-type"]).toBe("pro");
    });

    it("existing client user (L1 hit) → /portal", async () => {
      mockCurrentUserReturn = makeUser({
        publicMetadata: { userType: "client" },
      });

      const dest = await callAfterSignIn({});

      expect(dest).toBe("/portal");
      expect(mockCookieStore["x-user-type"]).toBe("client");
    });
  });

  // ===============================================================
  // L2: Direct Clerk REST API fallback
  // ===============================================================
  describe("L2: Clerk REST API fallback", () => {
    it("falls through to L2 when L1 has no userType", async () => {
      mockCurrentUserReturn = makeUser({
        publicMetadata: {}, // L1 miss
      });

      // L2 returns "pro" from Clerk API
      mockFetchReturn = {
        ok: true,
        status: 200,
        json: async () => ({ public_metadata: { userType: "pro" } }),
      };

      const dest = await callAfterSignIn({});

      expect(dest).toBe("/dashboard");
    });

    it("L2 returns client → /portal", async () => {
      mockCurrentUserReturn = makeUser({
        publicMetadata: {}, // L1 miss
      });

      mockFetchReturn = {
        ok: true,
        status: 200,
        json: async () => ({ public_metadata: { userType: "client" } }),
      };

      const dest = await callAfterSignIn({});

      expect(dest).toBe("/portal");
    });
  });

  // ===============================================================
  // L3: Clerk org membership
  // ===============================================================
  describe("L3: Org membership fallback", () => {
    it("user with org memberships (L1+L2 miss) → pro → /dashboard", async () => {
      mockCurrentUserReturn = makeUser({
        publicMetadata: {},
        organizationMemberships: [{ id: "org_123" }],
      });

      // L2 also misses
      mockFetchReturn = {
        ok: true,
        status: 200,
        json: async () => ({ public_metadata: {} }),
      };

      const dest = await callAfterSignIn({});

      expect(dest).toBe("/dashboard");
    });
  });

  // ===============================================================
  // L4: Direct SQL fallback
  // ===============================================================
  describe("L4: Direct SQL fallback", () => {
    it("SQL returns pro when L1-L3 all miss → /dashboard", async () => {
      mockCurrentUserReturn = makeUser({
        publicMetadata: {},
        organizationMemberships: [],
      });

      // L2 miss
      mockFetchReturn = {
        ok: true,
        status: 200,
        json: async () => ({ public_metadata: {} }),
      };

      // L4 returns "pro"
      mockPrismaQueryRawReturn = [{ userType: "pro" }];

      const dest = await callAfterSignIn({});

      expect(dest).toBe("/dashboard");
    });

    it("SQL returns client when L1-L3 all miss → /portal", async () => {
      mockCurrentUserReturn = makeUser({
        publicMetadata: {},
        organizationMemberships: [],
      });

      mockFetchReturn = {
        ok: true,
        status: 200,
        json: async () => ({ public_metadata: {} }),
      };

      mockPrismaQueryRawReturn = [{ userType: "client" }];

      const dest = await callAfterSignIn({});

      expect(dest).toBe("/portal");
    });
  });

  // ===============================================================
  // NEW USER — all layers miss → uses mode param or defaults client
  // ===============================================================
  describe("New user (all layers miss)", () => {
    function setupNewUser() {
      mockCurrentUserReturn = makeUser({
        publicMetadata: {},
        organizationMemberships: [],
      });

      // L2 miss
      mockFetchReturn = {
        ok: true,
        status: 200,
        json: async () => ({ public_metadata: {} }),
      };

      // L4 miss
      mockPrismaQueryRawReturn = [];
    }

    it("new user with mode=pro → registered as pro → /dashboard", async () => {
      setupNewUser();

      const dest = await callAfterSignIn({ mode: "pro" });

      // mode=pro triggers the override block, not the new user block
      expect(dest).toBe("/dashboard");
      expect(mockCookieStore["x-user-type"]).toBe("pro");
    });

    it("new user with mode=client → registered as client → /portal", async () => {
      setupNewUser();

      const dest = await callAfterSignIn({ mode: "client" });

      expect(dest).toBe("/portal");
      expect(mockCookieStore["x-user-type"]).toBe("client");
    });

    it("new user with NO mode and no org → defaults to client → /portal", async () => {
      setupNewUser();

      const dest = await callAfterSignIn({});

      // No mode + no org memberships → safer default is "client" (prevents dashboard stuck state)
      expect(dest).toBe("/portal");
      expect(mockCookieStore["x-user-type"]).toBe("client");
    });

    it("new user creates DB registry entry", async () => {
      setupNewUser();

      await callAfterSignIn({ mode: "pro" });

      // Mode override block does the DB upsert via $executeRaw
      expect(mockPrismaExecuteRawCalls.length).toBeGreaterThan(0);
    });
  });

  // ===============================================================
  // PENDING REDIRECT — must be honored for invite tokens
  // ===============================================================
  describe("Pending redirect_url", () => {
    it("existing pro user with redirect_url → honors redirect", async () => {
      mockCurrentUserReturn = makeUser({
        publicMetadata: { userType: "pro" },
      });

      const dest = await callAfterSignIn({
        redirect_url: "/trades/join?token=xyz",
      });

      expect(dest).toBe("/trades/join?token=xyz");
    });

    it("ignores non-path redirect_url (security)", async () => {
      mockCurrentUserReturn = makeUser({
        publicMetadata: { userType: "pro" },
      });

      // redirect_url that doesn't start with "/" should be ignored
      const dest = await callAfterSignIn({
        redirect_url: "https://evil.com/steal",
      });

      // Should NOT redirect to external URL
      expect(dest).toBe("/dashboard");
    });
  });
});
