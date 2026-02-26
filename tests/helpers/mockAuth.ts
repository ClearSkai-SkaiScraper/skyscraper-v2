/**
 * Mock Auth helper (Sprint 7 — Test Infrastructure)
 *
 * Provides standardised mocks for Clerk auth across all test suites.
 * Import and call `mockAuth()` at the top of any test file that touches
 * authenticated endpoints or server components.
 */

import { vi } from "vitest";

// ── Default test identities ─────────────────────────────────────────
export const TEST_USER_ID = "user_test_123";
export const TEST_ORG_ID = "org_test_456";
export const TEST_ORG_SLUG = "test-org";
export const TEST_SESSION_ID = "sess_test_789";

export const SECOND_USER_ID = "user_test_other";
export const SECOND_ORG_ID = "org_test_other";

interface MockAuthOptions {
  userId?: string | null;
  orgId?: string | null;
  orgSlug?: string;
  orgRole?: string;
  sessionId?: string;
}

/**
 * Call at the top of your test (or in `beforeEach`) to set up Clerk mocks.
 *
 * ```ts
 * import { mockAuth } from "@/tests/helpers/mockAuth";
 * mockAuth(); // defaults
 * mockAuth({ userId: null }); // unauthenticated
 * mockAuth({ orgId: SECOND_ORG_ID }); // cross-org test
 * ```
 */
export function mockAuth(options: MockAuthOptions = {}) {
  const {
    userId = TEST_USER_ID,
    orgId = TEST_ORG_ID,
    orgSlug = TEST_ORG_SLUG,
    orgRole = "org:admin",
    sessionId = TEST_SESSION_ID,
  } = options;

  const authReturn = {
    userId,
    orgId,
    orgSlug,
    orgRole,
    sessionId,
    sessionClaims: {
      org_id: orgId,
      org_slug: orgSlug,
      org_role: orgRole,
      sub: userId,
    },
    getToken: vi.fn().mockResolvedValue("mock-jwt-token"),
    has: vi.fn().mockReturnValue(true),
    protect: vi.fn(),
  };

  // Mock @clerk/nextjs
  vi.mock("@clerk/nextjs", async () => {
    const actual = await vi.importActual("@clerk/nextjs");
    return {
      ...actual,
      auth: vi.fn().mockResolvedValue(authReturn),
      currentUser: vi.fn().mockResolvedValue(
        userId
          ? {
              id: userId,
              firstName: "Test",
              lastName: "User",
              emailAddresses: [{ emailAddress: "test@example.com" }],
              primaryEmailAddressId: "email_test",
            }
          : null
      ),
      clerkClient: vi.fn().mockReturnValue({
        users: {
          getUser: vi.fn().mockResolvedValue({ id: userId, firstName: "Test" }),
          getUserList: vi.fn().mockResolvedValue({ data: [] }),
        },
        organizations: {
          getOrganization: vi.fn().mockResolvedValue({
            id: orgId,
            slug: orgSlug,
            name: "Test Org",
          }),
          getOrganizationMembershipList: vi.fn().mockResolvedValue({ data: [] }),
        },
      }),
    };
  });

  // Mock @clerk/nextjs/server
  vi.mock("@clerk/nextjs/server", async () => {
    const actual = await vi.importActual("@clerk/nextjs/server");
    return {
      ...actual,
      auth: vi.fn().mockResolvedValue(authReturn),
      currentUser: vi.fn().mockResolvedValue(
        userId
          ? {
              id: userId,
              firstName: "Test",
              lastName: "User",
              emailAddresses: [{ emailAddress: "test@example.com" }],
            }
          : null
      ),
    };
  });

  return authReturn;
}

/**
 * Convenience: set up "signed out" state for 401 tests.
 */
export function mockAuthSignedOut() {
  return mockAuth({ userId: null, orgId: null });
}

/**
 * Convenience: set up a second org for cross-tenant isolation tests.
 */
export function mockAuthOtherOrg() {
  return mockAuth({ userId: SECOND_USER_ID, orgId: SECOND_ORG_ID, orgSlug: "other-org" });
}
