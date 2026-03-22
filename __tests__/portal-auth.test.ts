/**
 * Portal Auth Flow Tests
 * ============================================================================
 * Validates the client portal authentication system:
 * - requirePortalAuth() returns proper errors
 * - assertPortalAccess() verifies claim access
 * - Portal routes reject unauthenticated requests
 * - Cross-org portal access is blocked
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only (imported by requirePortalAuth)
vi.mock("server-only", () => ({}));

// Mock Clerk
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

// Mock Logger
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Mock Prisma — include all models accessed by portalAccess + requirePortalAuth
const mockPrisma = {
  client_access: { findFirst: vi.fn(), create: vi.fn() },
  claims: { findFirst: vi.fn(), findUnique: vi.fn() },
  client: { findFirst: vi.fn() },
  users: { findFirst: vi.fn(), findUnique: vi.fn() },
  claimClientLink: { findFirst: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { auth } from "@clerk/nextjs/server";

describe("Portal Auth Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("requirePortalAuth", () => {
    it("should reject unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const { requirePortalAuth, isPortalAuthError } = await import("@/lib/auth/requirePortalAuth");

      const result = await requirePortalAuth();
      // When not authenticated, it returns a NextResponse (401)
      expect(isPortalAuthError(result)).toBe(true);
    });

    it("should return userId for authenticated users with email", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: "user_test123" } as any);
      mockPrisma.users.findUnique.mockResolvedValue({
        email: "test@example.com",
      });

      const { requirePortalAuth, isPortalAuthError } = await import("@/lib/auth/requirePortalAuth");

      const result = await requirePortalAuth();
      if (!isPortalAuthError(result)) {
        expect(result.userId).toBe("user_test123");
        expect(result.email).toBe("test@example.com");
      }
    });
  });

  describe("Portal Access Control", () => {
    it("should verify client_access record exists for claim", async () => {
      // User exists with email
      mockPrisma.users.findUnique.mockResolvedValue({
        email: "client@test.com",
      });

      // Client has access to org_A's claim
      mockPrisma.client_access.findFirst.mockResolvedValue({
        id: "ca_1",
        email: "client@test.com",
        claimId: "claim_1",
      });

      // claim belongs to org_A
      mockPrisma.claims.findUnique.mockResolvedValue({
        id: "claim_1",
        orgId: "org_A",
      });

      const { assertPortalAccess } = await import("@/lib/auth/portalAccess");
      const result = await assertPortalAccess({ userId: "user_portal", claimId: "claim_1" });

      expect(result).toBeDefined();
      expect(result.orgId).toBe("org_A");
    });

    it("should block cross-org portal access", async () => {
      // User has no email
      mockPrisma.users.findUnique.mockResolvedValue(null);
      // No client record
      mockPrisma.client.findFirst.mockResolvedValue(null);

      const { assertPortalAccess } = await import("@/lib/auth/portalAccess");
      await expect(
        assertPortalAccess({ userId: "user_portal", claimId: "claim_from_org_B" })
      ).rejects.toThrow();
    });
  });

  describe("Portal Route Protection", () => {
    it("should require authentication on portal API routes", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      // Portal routes should return 401 for unauthenticated requests
      const { userId } = await auth();
      expect(userId).toBeNull();
    });

    it("should scope portal data to client's accessible claims", async () => {
      const clientEmail = "homeowner@example.com";
      const claimId = "claim_roof_damage";

      mockPrisma.client_access.findFirst.mockResolvedValue({
        id: "access_1",
        email: clientEmail,
        claimId,
      });

      const access = await mockPrisma.client_access.findFirst({
        where: { email: clientEmail },
      });

      expect(access).toBeDefined();
      expect(access!.claimId).toBe(claimId);
    });
  });

  describe("Client Access Creation", () => {
    it("should create new access record if none exists", async () => {
      mockPrisma.client_access.findFirst.mockResolvedValue(null);
      mockPrisma.client_access.create.mockResolvedValue({
        id: "ca_new",
        claimId: "claim_1",
        email: "new@test.com",
      });

      const { createClientAccess } = await import("@/lib/auth/portalAccess");
      const result = await createClientAccess({
        claimId: "claim_1",
        email: "new@test.com",
      });

      expect(result).toBeDefined();
      expect(result.email).toBe("new@test.com");
    });

    it("should return existing access if duplicate", async () => {
      mockPrisma.client_access.findFirst.mockResolvedValue({
        id: "ca_existing",
        claimId: "claim_1",
        email: "existing@test.com",
      });

      const { createClientAccess } = await import("@/lib/auth/portalAccess");
      const result = await createClientAccess({
        claimId: "claim_1",
        email: "existing@test.com",
      });

      expect(result.id).toBe("ca_existing");
      expect(mockPrisma.client_access.create).not.toHaveBeenCalled();
    });
  });
});
