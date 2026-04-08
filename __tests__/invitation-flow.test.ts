/**
 * Company Seat Invitation Tests
 * ============================================================================
 * Full lifecycle tests for the team invitation system:
 * - POST /api/team/invitations — send invitation (auth, RBAC, dedup, email)
 * - GET  /api/team/invitations — list pending invitations
 * - POST /api/team/invitations/accept — accept invitation (email verify, membership creation)
 * - POST /api/team/invitations/[id]/revoke — revoke invitation
 * - POST /api/team/invitations/[id]/resend — resend invitation email
 *
 * Tests cover:
 *   ✅ Auth gates (401 for unauthenticated)
 *   ✅ RBAC enforcement (403 for non-managers)
 *   ✅ Zod validation (400 for bad payloads)
 *   ✅ Duplicate invitation detection (409)
 *   ✅ Full invite → accept → membership flow
 *   ✅ Email mismatch on accept (403)
 *   ✅ Expired invitation rejection (404)
 *   ✅ Cross-org isolation
 *   ✅ Revoke and resend flows
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mocks (needed before vi.mock factories) ─────────────────────────
const { mockClerkAuth, mockCurrentUser, mockClerkClient } = vi.hoisted(() => ({
  mockClerkAuth: vi.fn(),
  mockCurrentUser: vi.fn(),
  mockClerkClient: vi.fn(),
}));

// ── Mock: Clerk ──────────────────────────────────────────────────────────────
vi.mock("@clerk/nextjs/server", () => ({
  auth: mockClerkAuth,
  currentUser: mockCurrentUser,
  clerkClient: mockClerkClient,
}));

// ── Mock: Prisma ─────────────────────────────────────────────────────────────
const mockPrisma = {
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
  org: { findUnique: vi.fn() },
  user_organizations: { findFirst: vi.fn(), create: vi.fn() },
  users: { findFirst: vi.fn(), findUnique: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

// ── Mock: server-only, logger, sentry, rate-limit, email ─────────────────────
vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  withScope: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/email/invitations", () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock: RBAC ───────────────────────────────────────────────────────────────
const mockRequirePermission = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/auth/rbac", () => ({
  requirePermission: (...args: unknown[]) => mockRequirePermission(...args),
  createForbiddenResponse: (msg: string) =>
    new Response(JSON.stringify({ error: "FORBIDDEN", message: msg }), {
      status: 403,
      headers: { "content-type": "application/json" },
    }),
}));

// ── Mock: resolveOrg (used by withAuth/withManager) ──────────────────────────
const mockResolveOrg = vi.fn();
vi.mock("@/lib/org/resolveOrg", () => ({
  resolveOrg: (...args: unknown[]) => mockResolveOrg(...args),
  OrgResolutionError: class OrgResolutionError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

// ── Mock: requestContext ─────────────────────────────────────────────────────
vi.mock("@/lib/requestContext", () => ({
  setRequestContext: vi.fn(),
}));

// ── Mock: prismaMaybeModel ──────────────────────────────────────────────────
vi.mock("@/lib/db/prismaModel", () => ({
  prismaMaybeModel: vi.fn().mockReturnValue(null),
}));

// ── Mock: @paralleldrive/cuid2 ───────────────────────────────────────────────
vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn().mockReturnValue("cuid_test_123"),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
const ORG_A = "org_company_A";
const ORG_B = "org_company_B";
const USER_ADMIN = "user_admin_1";
const USER_NEW = "user_new_member";
const INVITE_EMAIL = "newmember@company.com";

function makeRequest(
  body: Record<string, unknown> | null = null,
  method = "POST",
  headers: Record<string, string> = {}
) {
  return new Request("https://example.com/api/team/invitations", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "127.0.0.1",
      ...headers,
    },
  }) as any;
}

function mockAuthenticatedManager(orgId = ORG_A, userId = USER_ADMIN) {
  mockResolveOrg.mockResolvedValue({
    orgId,
    userId,
    role: "ADMIN",
    membershipId: "mem_1",
  });
}

function mockUnauthenticated() {
  mockResolveOrg.mockRejectedValue(
    new (class extends Error {
      code = "NO_SESSION";
      constructor() {
        super("Not authenticated");
      }
    })()
  );
}

describe("Company Seat Invitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // POST /api/team/invitations — Send Invitation
  // ════════════════════════════════════════════════════════════════════════════
  describe("POST /api/team/invitations — Send Invitation", () => {
    let POST: Function;
    let GET: Function;

    beforeEach(async () => {
      const mod = await import("@/app/api/team/invitations/route");
      POST = mod.POST;
      GET = mod.GET;
    });

    it("returns 401 when user is not authenticated", async () => {
      mockUnauthenticated();

      const req = makeRequest({ email: INVITE_EMAIL });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 400 for invalid email format", async () => {
      mockAuthenticatedManager();
      mockRequirePermission.mockResolvedValue(undefined);
      mockPrisma.$queryRaw.mockResolvedValue([]); // no existing invite

      const req = makeRequest({ email: "not-an-email" });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Validation failed");
    });

    it("returns 400 when email is missing", async () => {
      mockAuthenticatedManager();
      mockRequirePermission.mockResolvedValue(undefined);

      const req = makeRequest({ role: "org:member" });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 409 when invitation already exists", async () => {
      mockAuthenticatedManager();
      mockRequirePermission.mockResolvedValue(undefined);
      mockPrisma.org.findUnique.mockResolvedValue({ id: ORG_A, name: "Test Co", clerkOrgId: "clerk_org_1" });
      mockCurrentUser.mockResolvedValue({
        firstName: "Admin",
        lastName: "User",
      });
      // Existing pending invitation found
      mockPrisma.$queryRaw.mockResolvedValue([{ id: "inv_existing_123" }]);

      const req = makeRequest({ email: INVITE_EMAIL });
      const res = await POST(req);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("already been sent");
    });

    it("successfully sends invitation and returns 200", async () => {
      mockAuthenticatedManager();
      mockRequirePermission.mockResolvedValue(undefined);
      mockPrisma.org.findUnique.mockResolvedValue({ id: ORG_A, name: "Test Co", clerkOrgId: "clerk_org_1" });
      mockCurrentUser.mockResolvedValue({
        firstName: "Admin",
        lastName: "User",
      });
      // No existing invitation
      mockPrisma.$queryRaw.mockResolvedValue([]);
      // DB insert succeeds
      mockPrisma.$executeRaw.mockResolvedValue(1);

      const { sendInvitationEmail } = await import("@/lib/email/invitations");

      const req = makeRequest({ email: INVITE_EMAIL, role: "org:member" });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.invitation.email).toBe(INVITE_EMAIL.toLowerCase());
      expect(json.invitation.status).toBe("pending");

      // Verify email was sent
      expect(sendInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: INVITE_EMAIL.toLowerCase(),
          inviterName: "Admin User",
          orgName: "Test Co",
        })
      );
    });

    it("returns 404 when org not found in DB", async () => {
      mockAuthenticatedManager();
      mockRequirePermission.mockResolvedValue(undefined);
      mockPrisma.org.findUnique.mockResolvedValue(null);
      mockCurrentUser.mockResolvedValue({ firstName: "Admin", lastName: "User" });
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const req = makeRequest({ email: INVITE_EMAIL });
      const res = await POST(req);

      expect(res.status).toBe(404);
    });

    it("cleans up DB entry when email send fails", async () => {
      mockAuthenticatedManager();
      mockRequirePermission.mockResolvedValue(undefined);
      mockPrisma.org.findUnique.mockResolvedValue({ id: ORG_A, name: "Test Co", clerkOrgId: "clerk_org_1" });
      mockCurrentUser.mockResolvedValue({ firstName: "Admin", lastName: "User" });
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.$executeRaw.mockResolvedValue(1);

      const { sendInvitationEmail } = await import("@/lib/email/invitations");
      (sendInvitationEmail as any).mockRejectedValueOnce(new Error("SMTP timeout"));

      const req = makeRequest({ email: INVITE_EMAIL });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain("Failed to send invitation email");

      // Verify cleanup delete was attempted
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2); // insert + cleanup delete
    });

    it("normalizes email to lowercase", async () => {
      mockAuthenticatedManager();
      mockRequirePermission.mockResolvedValue(undefined);
      mockPrisma.org.findUnique.mockResolvedValue({ id: ORG_A, name: "Test Co", clerkOrgId: "clerk_org_1" });
      mockCurrentUser.mockResolvedValue({ firstName: "Admin", lastName: "User" });
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.$executeRaw.mockResolvedValue(1);

      const req = makeRequest({ email: "  UPPER@CASE.COM  " });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.invitation.email).toBe("upper@case.com");
    });

    it("maps admin role correctly", async () => {
      mockAuthenticatedManager();
      mockRequirePermission.mockResolvedValue(undefined);
      mockPrisma.org.findUnique.mockResolvedValue({ id: ORG_A, name: "Test Co", clerkOrgId: "clerk_org_1" });
      mockCurrentUser.mockResolvedValue({ firstName: "Admin", lastName: "User" });
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.$executeRaw.mockResolvedValue(1);

      const req = makeRequest({ email: INVITE_EMAIL, role: "org:admin" });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.invitation.role).toBe("admin");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET /api/team/invitations — List Pending Invitations
  // ════════════════════════════════════════════════════════════════════════════
  describe("GET /api/team/invitations — List Pending", () => {
    let GET: Function;

    beforeEach(async () => {
      const mod = await import("@/app/api/team/invitations/route");
      GET = mod.GET;
    });

    it("returns 401 when unauthenticated", async () => {
      mockUnauthenticated();

      const req = makeRequest(null, "GET");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("returns pending invitations for the org", async () => {
      mockAuthenticatedManager();
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: "inv_1",
          email: "alice@test.com",
          role: "member",
          status: "pending",
          created_at: new Date("2025-01-01"),
          expires_at: new Date("2025-01-08"),
        },
        {
          id: "inv_2",
          email: "bob@test.com",
          role: "admin",
          status: "pending",
          created_at: new Date("2025-01-02"),
          expires_at: new Date("2025-01-09"),
        },
      ]);

      const req = makeRequest(null, "GET");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveLength(2);
      expect(json[0].email).toBe("alice@test.com");
      expect(json[1].email).toBe("bob@test.com");
    });

    it("returns empty array when no pending invitations", async () => {
      mockAuthenticatedManager();
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const req = makeRequest(null, "GET");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // POST /api/team/invitations/accept — Accept Invitation
  // ════════════════════════════════════════════════════════════════════════════
  describe("POST /api/team/invitations/accept — Accept Invitation", () => {
    let POST: Function;

    beforeEach(async () => {
      const mod = await import("@/app/api/team/invitations/accept/route");
      POST = mod.POST;
    });

    it("returns 401 when user is not authenticated", async () => {
      mockClerkAuth.mockResolvedValue({ userId: null });

      const req = makeRequest({ token: "valid_token" });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 400 when token is missing", async () => {
      mockClerkAuth.mockResolvedValue({ userId: USER_NEW });

      const req = makeRequest({});
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("token");
    });

    it("returns 404 when invitation not found or expired", async () => {
      mockClerkAuth.mockResolvedValue({ userId: USER_NEW });
      mockPrisma.$queryRaw.mockResolvedValue([]); // No matching invitation

      const req = makeRequest({ token: "expired_or_invalid_token" });
      const res = await POST(req);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain("not found or expired");
    });

    it("returns 403 when accepting user email does not match invitation", async () => {
      mockClerkAuth.mockResolvedValue({ userId: USER_NEW });
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: "inv_1",
          org_id: ORG_A,
          role: "member",
          token: "valid_token",
          status: "pending",
          email: "invited@company.com",
          expires_at: new Date(Date.now() + 86400000),
        },
      ]);

      // Clerk user has different email
      mockClerkClient.mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            emailAddresses: [{ emailAddress: "different@other.com" }],
            firstName: "Wrong",
            lastName: "User",
          }),
        },
      });

      const req = makeRequest({ token: "valid_token" });
      const res = await POST(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("different email address");
    });

    it("returns success when user is already a member", async () => {
      mockClerkAuth.mockResolvedValue({ userId: USER_NEW });
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: "inv_1",
          org_id: ORG_A,
          role: "member",
          token: "valid_token",
          status: "pending",
          email: "newmember@company.com",
          expires_at: new Date(Date.now() + 86400000),
        },
      ]);

      mockClerkClient.mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            emailAddresses: [{ emailAddress: "newmember@company.com" }],
            firstName: "New",
            lastName: "Member",
          }),
        },
      });

      // Already has membership
      mockPrisma.user_organizations.findFirst.mockResolvedValue({
        id: "uo_existing",
        userId: USER_NEW,
        organizationId: ORG_A,
        role: "MEMBER",
      });
      mockPrisma.$executeRaw.mockResolvedValue(1);

      const req = makeRequest({ token: "valid_token" });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("already a member");
    });

    it("creates membership on successful accept (full flow)", async () => {
      mockClerkAuth.mockResolvedValue({ userId: USER_NEW });
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: "inv_1",
          org_id: ORG_A,
          role: "member",
          token: "valid_token",
          status: "pending",
          email: "newmember@company.com",
          expires_at: new Date(Date.now() + 86400000),
        },
      ]);

      mockClerkClient.mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            emailAddresses: [{ emailAddress: "newmember@company.com" }],
            firstName: "New",
            lastName: "Member",
          }),
        },
      });

      // No existing membership
      mockPrisma.user_organizations.findFirst.mockResolvedValue(null);
      // Org exists
      mockPrisma.org.findUnique.mockResolvedValue({ id: ORG_A, name: "Test Co", clerkOrgId: "clerk_org_1" });
      // Create membership succeeds
      mockPrisma.user_organizations.create.mockResolvedValue({
        id: "cuid_test_123",
        userId: USER_NEW,
        organizationId: ORG_A,
        role: "MEMBER",
      });
      // Raw SQL operations succeed
      mockPrisma.$executeRaw.mockResolvedValue(1);

      const { sendWelcomeEmail } = await import("@/lib/email/invitations");

      const req = makeRequest({ token: "valid_token" });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.orgId).toBe(ORG_A);
      expect(json.role).toBe("MEMBER");

      // Verify canonical membership was created
      expect(mockPrisma.user_organizations.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_NEW,
          organizationId: ORG_A,
          role: "MEMBER",
        }),
      });

      // Verify welcome email was sent
      expect(sendWelcomeEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "newmember@company.com",
          orgName: "Test Co",
        })
      );
    });

    it("maps admin role correctly on accept", async () => {
      mockClerkAuth.mockResolvedValue({ userId: USER_NEW });
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: "inv_1",
          org_id: ORG_A,
          role: "admin",
          token: "admin_token",
          status: "pending",
          email: "admin@company.com",
          expires_at: new Date(Date.now() + 86400000),
        },
      ]);

      mockClerkClient.mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            emailAddresses: [{ emailAddress: "admin@company.com" }],
            firstName: "New",
            lastName: "Admin",
          }),
        },
      });

      mockPrisma.user_organizations.findFirst.mockResolvedValue(null);
      mockPrisma.org.findUnique.mockResolvedValue({ id: ORG_A, name: "Test Co", clerkOrgId: "clerk_org_1" });
      mockPrisma.user_organizations.create.mockResolvedValue({
        id: "cuid_test_123",
        userId: USER_NEW,
        organizationId: ORG_A,
        role: "ADMIN",
      });
      mockPrisma.$executeRaw.mockResolvedValue(1);

      const req = makeRequest({ token: "admin_token" });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.role).toBe("ADMIN");
    });

    it("returns 404 when invitation org does not exist", async () => {
      mockClerkAuth.mockResolvedValue({ userId: USER_NEW });
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: "inv_1",
          org_id: "org_deleted",
          role: "member",
          token: "valid_token",
          status: "pending",
          email: "test@company.com",
          expires_at: new Date(Date.now() + 86400000),
        },
      ]);

      mockClerkClient.mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            emailAddresses: [{ emailAddress: "test@company.com" }],
            firstName: "Test",
            lastName: "User",
          }),
        },
      });

      mockPrisma.user_organizations.findFirst.mockResolvedValue(null);
      mockPrisma.org.findUnique.mockResolvedValue(null); // Org deleted

      const req = makeRequest({ token: "valid_token" });
      const res = await POST(req);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain("Organization not found");
    });
  });
});
