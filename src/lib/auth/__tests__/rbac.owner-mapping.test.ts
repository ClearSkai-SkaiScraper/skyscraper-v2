/**
 * Locks in the OWNER → admin mapping fix in getCurrentUserRole().
 *
 * Regression test for the bug where user_organizations.role = 'OWNER'
 * was silently demoted to 'member', causing org owners to see
 * "Admin Access Required" on Financial Overview and other admin pages.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks must be declared before importing the SUT
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user_organizations: {
      findFirst: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    users: {
      findFirst: vi.fn(),
    },
    org: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/modelAliases", () => ({
  getDelegate: () => ({
    findUnique: vi.fn().mockResolvedValue(null), // no team_members row — force fallback path
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/permissions/constants", () => ({
  normalizeRole: (r: string) => (r || "").toLowerCase(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { auth } = require("@clerk/nextjs/server");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const prisma = require("@/lib/prisma").default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getCurrentUserRole } = require("@/lib/auth/rbac");

describe("getCurrentUserRole — OWNER mapping regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({
      userId: "user_abc",
      orgId: "org_xyz",
      sessionClaims: {},
    });
    prisma.users.findFirst.mockResolvedValue(null);
    prisma.org.findFirst.mockResolvedValue(null);
  });

  it("maps user_organizations.role = 'OWNER' (uppercase) → admin", async () => {
    prisma.user_organizations.findFirst.mockResolvedValue({ role: "OWNER" });
    const result = await getCurrentUserRole();
    expect(result?.role).toBe("admin");
  });

  it("maps user_organizations.role = 'owner' (lowercase) → admin", async () => {
    prisma.user_organizations.findFirst.mockResolvedValue({ role: "owner" });
    const result = await getCurrentUserRole();
    expect(result?.role).toBe("admin");
  });

  it("maps user_organizations.role = 'Admin' (mixed) → admin", async () => {
    prisma.user_organizations.findFirst.mockResolvedValue({ role: "Admin" });
    const result = await getCurrentUserRole();
    expect(result?.role).toBe("admin");
  });

  it("maps 'MANAGER' → manager, 'VIEWER' → viewer, 'MEMBER' → member", async () => {
    for (const [raw, expected] of [
      ["MANAGER", "manager"],
      ["VIEWER", "viewer"],
      ["MEMBER", "member"],
    ] as const) {
      prisma.user_organizations.findFirst.mockResolvedValue({ role: raw });
      const result = await getCurrentUserRole();
      expect(result?.role).toBe(expected);
    }
  });

  it("falls back to users.role when user_organizations.role is null", async () => {
    prisma.user_organizations.findFirst.mockResolvedValue({ role: null });
    prisma.users.findFirst.mockResolvedValue({ role: "OWNER" });
    const result = await getCurrentUserRole();
    expect(result?.role).toBe("admin");
  });

  it("defaults to member when nothing is set anywhere", async () => {
    prisma.user_organizations.findFirst.mockResolvedValue({ role: null });
    prisma.users.findFirst.mockResolvedValue(null);
    const result = await getCurrentUserRole();
    expect(result?.role).toBe("member");
  });
});
