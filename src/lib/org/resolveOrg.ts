/**
 * ============================================================================
 * resolveOrg — CANONICAL ORG RESOLVER (Single Source of Truth)
 * ============================================================================
 *
 * This is the ONE function that resolves an org ID for any authenticated user.
 *
 * RULES:
 *   1. DB membership (user_organizations) is the source of truth
 *   2. Always returns the OLDEST membership (orderBy: createdAt asc)
 *   3. NEVER auto-creates orgs — if no membership exists, it throws
 *   4. Validates that the org row actually exists (not just the membership)
 *
 * WHY THIS EXISTS:
 *   Before this, we had 8+ resolvers that each auto-created orgs with
 *   different clerkOrgId formats (timestamped, prefixed, etc.), causing
 *   data to scatter across phantom orgs. This is the fix.
 *
 * USAGE:
 *   const { orgId, userId, role } = await resolveOrg();
 *
 * ERROR HANDLING:
 *   - Throws "unauthenticated" if no Clerk session
 *   - Throws "no-org" if user has no valid org membership
 *   - These are intentional — callers must handle them explicitly
 *
 * ============================================================================
 */

import "server-only";

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";

export interface ResolvedOrg {
  orgId: string;
  userId: string;
  role: string;
  membershipId: string;
}

/**
 * Resolve the current user's canonical org.
 *
 * @throws {OrgResolutionError} if unauthenticated or no org found
 */
export async function resolveOrg(): Promise<ResolvedOrg> {
  // ── 1. Get authenticated user ──────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();

  if (!userId) {
    throw new OrgResolutionError("unauthenticated", "No authenticated user session");
  }

  // ── 2. Find oldest valid membership ────────────────────────────────────
  const memberships = await prisma.user_organizations.findMany({
    where: { userId },
    include: { Org: { select: { id: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Find first membership whose org still exists in the DB
  const valid = memberships.find((m) => m.organizationId && m.Org);

  if (!valid || !valid.organizationId) {
    throw new OrgResolutionError(
      "no-org",
      `User ${userId} has no valid org membership (${memberships.length} total, 0 valid)`
    );
  }

  return {
    orgId: valid.organizationId,
    userId,
    role: valid.role ?? "MEMBER",
    membershipId: valid.id,
  };
}

/**
 * Same as resolveOrg but returns null instead of throwing.
 * Use in contexts where org is optional (e.g., public pages).
 */
export async function resolveOrgSafe(): Promise<ResolvedOrg | null> {
  try {
    return await resolveOrg();
  } catch {
    return null;
  }
}

// ── Error class ────────────────────────────────────────────────────────────

export class OrgResolutionError extends Error {
  public readonly reason: "unauthenticated" | "no-org";

  constructor(reason: "unauthenticated" | "no-org", message: string) {
    super(message);
    this.name = "OrgResolutionError";
    this.reason = reason;
  }
}
