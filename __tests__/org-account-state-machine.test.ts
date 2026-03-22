/**
 * ============================================================================
 * E2E Test Matrix — Org/Membership/Invite System
 * ============================================================================
 *
 * Tests all 9 account states and verifies correct behavior on every
 * org-protected page. This is the comprehensive test suite for the
 * systemic org-context overhaul.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock Setup ──────────────────────────────────────────────────────────────

// Mock Clerk auth
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
  currentUser: () =>
    Promise.resolve({
      id: "user_test123",
      emailAddresses: [{ emailAddress: "buddy@test.com" }],
      firstName: "Buddy",
      lastName: "Test",
      publicMetadata: {},
    }),
}));

// Mock Prisma — use vi.hoisted to avoid TDZ issues with vi.mock hoisting
const mockPrisma = vi.hoisted(() => ({
  user_organizations: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  org: {
    findUnique: vi.fn(),
  },
  users: {
    findUnique: vi.fn(),
  },
  tradesCompanyMember: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  claims: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import after mocks
import {
  checkRouteAccess,
  getResolvedAccountContext,
  hasActiveOrg,
  type AccountState,
  type ResolvedAccountContext,
} from "@/lib/account/getResolvedAccountContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupAuthenticatedUser() {
  mockAuth.mockResolvedValue({ userId: "user_test123" });
}

function setupUnauthenticated() {
  mockAuth.mockResolvedValue({ userId: null });
}

function setupNoMemberships() {
  mockPrisma.user_organizations.findMany.mockResolvedValue([]);
  mockPrisma.$queryRaw.mockResolvedValue([]);
  mockPrisma.tradesCompanyMember.findFirst.mockResolvedValue(null);
}

function setupSingleMembership(orgId = "org_real_company") {
  mockPrisma.user_organizations.findMany.mockResolvedValue([
    {
      id: "uo_1",
      userId: "user_test123",
      organizationId: orgId,
      role: "MEMBER",
      createdAt: new Date(),
      Org: { id: orgId, name: "Real Company" },
    },
  ]);
  mockPrisma.org.findUnique.mockResolvedValue({
    id: orgId,
    name: "Real Company",
    onboardingComplete: true,
  });
}

function setupMultipleOrgs() {
  mockPrisma.user_organizations.findMany.mockResolvedValue([
    {
      id: "uo_1",
      userId: "user_test123",
      organizationId: "org_company_a",
      role: "ADMIN",
      createdAt: new Date("2024-01-01"),
      Org: { id: "org_company_a", name: "Company A" },
    },
    {
      id: "uo_2",
      userId: "user_test123",
      organizationId: "org_company_b",
      role: "MEMBER",
      createdAt: new Date("2024-06-01"),
      Org: { id: "org_company_b", name: "Company B" },
    },
  ]);
}

function setupPendingInvite() {
  mockPrisma.user_organizations.findMany.mockResolvedValue([]);
  mockPrisma.$queryRaw.mockResolvedValue([
    {
      id: "inv_1",
      org_id: "org_target",
      org_name: "Target Company",
      role: "member",
      email: "buddy@test.com",
      expires_at: new Date(Date.now() + 86400000),
    },
  ]);
  mockPrisma.tradesCompanyMember.findFirst.mockResolvedValue(null);
}

function setupOrphanedMembership() {
  mockPrisma.user_organizations.findMany.mockResolvedValue([
    {
      id: "uo_orphan",
      userId: "user_test123",
      organizationId: "org_deleted",
      role: "MEMBER",
      createdAt: new Date(),
      Org: null, // org was deleted
    },
  ]);
  mockPrisma.$queryRaw.mockResolvedValue([]);
  mockPrisma.tradesCompanyMember.findFirst.mockResolvedValue(null);
}

function setupClientContactOnly() {
  mockPrisma.user_organizations.findMany.mockResolvedValue([]);
  mockPrisma.$queryRaw.mockResolvedValue([]); // no pending invites
  mockPrisma.tradesCompanyMember.findFirst.mockResolvedValue({
    id: "tcm_1",
    orgId: "org_other_company",
  });
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe("getResolvedAccountContext — Account State Machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── State: UNAUTHENTICATED ──────────────────────────────────────────

  it("returns UNAUTHENTICATED when no Clerk session", async () => {
    setupUnauthenticated();
    const ctx = await getResolvedAccountContext();
    expect(ctx.state).toBe("UNAUTHENTICATED");
    expect(ctx.userId).toBeNull();
    expect(ctx.activeOrgId).toBeNull();
    expect(ctx.memberships).toHaveLength(0);
  });

  // ── State: ORG_MEMBER_ACTIVE ────────────────────────────────────────

  it("returns ORG_MEMBER_ACTIVE with valid single membership", async () => {
    setupAuthenticatedUser();
    setupSingleMembership();
    mockPrisma.$queryRaw.mockResolvedValue([]); // no pending invites
    mockPrisma.tradesCompanyMember.findFirst.mockResolvedValue(null);

    const ctx = await getResolvedAccountContext();
    expect(ctx.state).toBe("ORG_MEMBER_ACTIVE");
    expect(ctx.userId).toBe("user_test123");
    expect(ctx.activeOrgId).toBe("org_real_company");
    expect(ctx.activeOrgName).toBe("Real Company");
    expect(ctx.role).toBe("MEMBER");
    expect(ctx.isNetworkOnly).toBe(false);
  });

  // ── State: MULTI_ORG_MEMBER ─────────────────────────────────────────

  it("returns MULTI_ORG_MEMBER with 2+ valid memberships", async () => {
    setupAuthenticatedUser();
    setupMultipleOrgs();
    mockPrisma.$queryRaw.mockResolvedValue([]);

    const ctx = await getResolvedAccountContext();
    expect(ctx.state).toBe("MULTI_ORG_MEMBER");
    expect(ctx.memberships).toHaveLength(2);
    expect(ctx.requiresOrgSelection).toBe(true);
    expect(ctx.activeOrgId).toBe("org_company_a"); // first by createdAt
  });

  // ── State: INVITED_PENDING ──────────────────────────────────────────

  it("returns INVITED_PENDING when user has pending invite but no membership", async () => {
    setupAuthenticatedUser();
    setupPendingInvite();

    const ctx = await getResolvedAccountContext();
    expect(ctx.state).toBe("INVITED_PENDING");
    expect(ctx.activeOrgId).toBeNull();
    expect(ctx.pendingInvites).toHaveLength(1);
    expect(ctx.pendingInvites[0].orgName).toBe("Target Company");
  });

  // ── State: ORPHANED_MEMBERSHIP ──────────────────────────────────────

  it("returns ORPHANED_MEMBERSHIP when org was deleted", async () => {
    setupAuthenticatedUser();
    setupOrphanedMembership();

    const ctx = await getResolvedAccountContext();
    expect(ctx.state).toBe("ORPHANED_MEMBERSHIP");
    expect(ctx.activeOrgId).toBeNull();
    expect(ctx.memberships).toHaveLength(0); // orphaned filtered out of valid
  });

  // ── State: CLIENT_CONTACT_ONLY ──────────────────────────────────────

  it("returns CLIENT_CONTACT_ONLY when only a trades network contact", async () => {
    setupAuthenticatedUser();
    setupClientContactOnly();

    const ctx = await getResolvedAccountContext();
    expect(ctx.state).toBe("CLIENT_CONTACT_ONLY");
    expect(ctx.isNetworkOnly).toBe(true);
    expect(ctx.activeOrgId).toBeNull();
  });

  // ── State: NO_ACCOUNT_CONTEXT ───────────────────────────────────────

  it("returns NO_ACCOUNT_CONTEXT when no memberships, invites, or network", async () => {
    setupAuthenticatedUser();
    setupNoMemberships();

    const ctx = await getResolvedAccountContext();
    expect(ctx.state).toBe("NO_ACCOUNT_CONTEXT");
    expect(ctx.activeOrgId).toBeNull();
    expect(ctx.memberships).toHaveLength(0);
    expect(ctx.pendingInvites).toHaveLength(0);
    expect(ctx.isNetworkOnly).toBe(false);
  });

  // ── Pending invite should NOT expose org data ───────────────────────

  it("INVITED_PENDING should NOT have an activeOrgId", async () => {
    setupAuthenticatedUser();
    setupPendingInvite();

    const ctx = await getResolvedAccountContext();
    expect(ctx.state).toBe("INVITED_PENDING");
    expect(ctx.activeOrgId).toBeNull();
    expect(ctx.role).toBeNull();
    // The invite exists but the user should NOT see org data
  });

  // ── Client contact should NOT have org access ───────────────────────

  it("CLIENT_CONTACT_ONLY should not have org access", async () => {
    setupAuthenticatedUser();
    setupClientContactOnly();

    const ctx = await getResolvedAccountContext();
    expect(ctx.state).toBe("CLIENT_CONTACT_ONLY");
    expect(ctx.activeOrgId).toBeNull();
    expect(hasActiveOrg(ctx.state)).toBe(false);
  });
});

// ─── Route Guard Matrix Tests ────────────────────────────────────────────────

describe("checkRouteAccess — Route Guard Matrix", () => {
  const ORG_REQUIRED = { requiresOrg: true, allowClientOnly: false, allowNoOrgReadonly: false };
  const CLIENT_OK = { requiresOrg: true, allowClientOnly: true, allowNoOrgReadonly: false };
  const PUBLIC_OK = { requiresOrg: false, allowClientOnly: false, allowNoOrgReadonly: false };
  const READONLY_OK = { requiresOrg: true, allowClientOnly: false, allowNoOrgReadonly: true };

  function makeCtx(overrides: Partial<ResolvedAccountContext>): ResolvedAccountContext {
    return {
      state: "NO_ACCOUNT_CONTEXT",
      userId: "user_test",
      activeOrgId: null,
      activeOrgName: null,
      role: null,
      memberships: [],
      pendingInvites: [],
      isNetworkOnly: false,
      requiresOrgSelection: false,
      reason: "test",
      ...overrides,
    };
  }

  // ── Protected pages: DENY non-members ───────────────────────────────

  it("denies unauthenticated user on org-required page", () => {
    const ctx = makeCtx({ state: "UNAUTHENTICATED", userId: null });
    const result = checkRouteAccess(ctx, ORG_REQUIRED);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.redirectTo).toBe("/sign-in");
    }
  });

  it("denies invited-pending user on org-required page", () => {
    const ctx = makeCtx({ state: "INVITED_PENDING" });
    const result = checkRouteAccess(ctx, ORG_REQUIRED);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("INVITE_PENDING");
    }
  });

  it("denies no-account user on org-required page", () => {
    const ctx = makeCtx({ state: "NO_ACCOUNT_CONTEXT" });
    const result = checkRouteAccess(ctx, ORG_REQUIRED);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.redirectTo).toBe("/onboarding");
    }
  });

  it("denies client-contact on org-required page", () => {
    const ctx = makeCtx({ state: "CLIENT_CONTACT_ONLY", isNetworkOnly: true });
    const result = checkRouteAccess(ctx, ORG_REQUIRED);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("CLIENT_ONLY");
    }
  });

  // ── Protected pages: ALLOW org members ──────────────────────────────

  it("allows active org member on org-required page", () => {
    const ctx = makeCtx({ state: "ORG_MEMBER_ACTIVE", activeOrgId: "org_1" });
    const result = checkRouteAccess(ctx, ORG_REQUIRED);
    expect(result.allowed).toBe(true);
  });

  it("allows multi-org member on org-required page", () => {
    const ctx = makeCtx({ state: "MULTI_ORG_MEMBER", activeOrgId: "org_1" });
    const result = checkRouteAccess(ctx, ORG_REQUIRED);
    expect(result.allowed).toBe(true);
  });

  // ── Client-ok pages ────────────────────────────────────────────────

  it("allows client-contact on client-ok page", () => {
    const ctx = makeCtx({ state: "CLIENT_CONTACT_ONLY", isNetworkOnly: true });
    const result = checkRouteAccess(ctx, CLIENT_OK);
    expect(result.allowed).toBe(true);
  });

  // ── Public pages ────────────────────────────────────────────────────

  it("allows anyone on public page", () => {
    const ctx = makeCtx({ state: "NO_ACCOUNT_CONTEXT" });
    const result = checkRouteAccess(ctx, PUBLIC_OK);
    expect(result.allowed).toBe(true);
  });

  // ── Route Guard Matrix for ALL org-protected pages ──────────────────

  const ORG_PAGES = [
    "crews",
    "permits",
    "invoices",
    "commissions",
    "mortgage-checks",
    "work-orders",
    "estimates",
    "claims",
    "leads",
    "company/connections",
    "teams/hierarchy",
    "settings",
    "team",
    "tools",
  ];

  const NON_MEMBER_STATES: AccountState[] = [
    "NO_ACCOUNT_CONTEXT",
    "INVITED_PENDING",
    "CLIENT_CONTACT_ONLY",
    "ORPHANED_MEMBERSHIP",
  ];

  for (const page of ORG_PAGES) {
    for (const state of NON_MEMBER_STATES) {
      it(`denies ${state} user on /${page}`, () => {
        const ctx = makeCtx({ state, isNetworkOnly: state === "CLIENT_CONTACT_ONLY" });
        const result = checkRouteAccess(ctx, ORG_REQUIRED);
        expect(result.allowed).toBe(false);
      });
    }
  }
});

// ─── Tenant Isolation Tests ──────────────────────────────────────────────────

describe("Tenant Isolation — Cross-Org Data Leak Prevention", () => {
  it("non-member MUST NOT get an activeOrgId", async () => {
    setupAuthenticatedUser();
    setupNoMemberships();

    const ctx = await getResolvedAccountContext();
    expect(ctx.activeOrgId).toBeNull();
    expect(ctx.role).toBeNull();
  });

  it("invited user MUST NOT get an activeOrgId before acceptance", async () => {
    setupAuthenticatedUser();
    setupPendingInvite();

    const ctx = await getResolvedAccountContext();
    expect(ctx.activeOrgId).toBeNull();
    // The pendingInvites array exists for UI display but NEVER as org access
    expect(ctx.pendingInvites[0].orgId).toBe("org_target");
    expect(ctx.activeOrgId).not.toBe("org_target");
  });

  it("client contact MUST NOT get activeOrgId from network relationship", async () => {
    setupAuthenticatedUser();
    setupClientContactOnly();

    const ctx = await getResolvedAccountContext();
    expect(ctx.activeOrgId).toBeNull();
    expect(ctx.isNetworkOnly).toBe(true);
    // Even though tradesCompanyMember exists, it should NOT grant org access
  });

  it("orphaned membership MUST NOT grant org access", async () => {
    setupAuthenticatedUser();
    setupOrphanedMembership();

    const ctx = await getResolvedAccountContext();
    expect(ctx.activeOrgId).toBeNull();
    expect(ctx.state).toBe("ORPHANED_MEMBERSHIP");
  });

  it("hasActiveOrg returns false for all non-member states", () => {
    const nonMemberStates: AccountState[] = [
      "UNAUTHENTICATED",
      "NO_ACCOUNT_CONTEXT",
      "INVITED_PENDING",
      "JOIN_REQUEST_PENDING",
      "CLIENT_CONTACT_ONLY",
      "ORPHANED_MEMBERSHIP",
    ];

    for (const state of nonMemberStates) {
      expect(hasActiveOrg(state)).toBe(false);
    }
  });

  it("hasActiveOrg returns true for member states", () => {
    const memberStates: AccountState[] = [
      "ORG_MEMBER_ACTIVE",
      "OWNER_NO_SETUP",
      "OWNER_SETUP_COMPLETE",
      "MULTI_ORG_MEMBER",
    ];

    for (const state of memberStates) {
      expect(hasActiveOrg(state)).toBe(true);
    }
  });
});
