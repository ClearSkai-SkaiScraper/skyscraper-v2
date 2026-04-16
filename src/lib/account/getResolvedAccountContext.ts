/**
 * ============================================================================
 * getResolvedAccountContext() — MASTER ACCOUNT STATE MACHINE
 * ============================================================================
 *
 * THE SINGLE SOURCE OF TRUTH for "who this user is in relation to an organization."
 *
 * Returns a deterministic AccountState enum plus all context needed to make
 * routing, rendering, and data-access decisions.
 *
 * ACCOUNT STATES:
 * ┌─────────────────────────┬──────────────────────────────────────────────────┐
 * │ UNAUTHENTICATED         │ Not signed in                                    │
 * │ NO_ACCOUNT_CONTEXT      │ Signed in, no org, no invite, no join request    │
 * │ INVITED_PENDING         │ Has pending invite, not yet accepted             │
 * │ JOIN_REQUEST_PENDING    │ Requested to join org, awaiting approval         │
 * │ ORG_MEMBER_ACTIVE       │ Valid org membership, orgId available            │
 * │ CLIENT_CONTACT_ONLY     │ In trades network as contact, NOT org member     │
 * │ MULTI_ORG_MEMBER        │ Belongs to 2+ orgs, must choose active          │
 * │ ORPHANED_MEMBERSHIP     │ Stale membership / invalid org / soft-deleted    │
 * │ OWNER_NO_SETUP          │ Org exists but onboarding incomplete             │
 * │ OWNER_SETUP_COMPLETE    │ Org exists and fully usable                      │
 * └─────────────────────────┴──────────────────────────────────────────────────┘
 *
 * USAGE:
 *   const ctx = await getResolvedAccountContext();
 *   if (ctx.state === "ORG_MEMBER_ACTIVE") {
 *     // Safe to query with ctx.orgId
 *   }
 */

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// =============================================================================
// TYPES
// =============================================================================

export type AccountState =
  | "UNAUTHENTICATED"
  | "NO_ACCOUNT_CONTEXT"
  | "INVITED_PENDING"
  | "JOIN_REQUEST_PENDING"
  | "ORG_MEMBER_ACTIVE"
  | "CLIENT_CONTACT_ONLY"
  | "MULTI_ORG_MEMBER"
  | "ORPHANED_MEMBERSHIP"
  | "OWNER_NO_SETUP"
  | "OWNER_SETUP_COMPLETE";

export interface PendingInvite {
  id: string;
  orgId: string;
  orgName: string | null;
  role: string;
  email: string;
  expiresAt: Date;
}

export interface OrgMembership {
  id: string;
  organizationId: string;
  role: string;
  orgName: string | null;
  orgExists: boolean;
}

export interface ResolvedAccountContext {
  /** The deterministic account state */
  state: AccountState;
  /** Clerk user ID (null if unauthenticated) */
  userId: string | null;
  /** Active org ID (null if no active org) */
  activeOrgId: string | null;
  /** Active org name */
  activeOrgName: string | null;
  /** User's role in active org */
  role: string | null;
  /** All valid memberships */
  memberships: OrgMembership[];
  /** Pending invitations */
  pendingInvites: PendingInvite[];
  /** Whether user is a network contact only (no org membership) */
  isNetworkOnly: boolean;
  /** Whether user needs to select which org to use */
  requiresOrgSelection: boolean;
  /** Detailed reason for the state (for logging/debugging) */
  reason: string;
}

// =============================================================================
// MAIN RESOLVER
// =============================================================================

export async function getResolvedAccountContext(): Promise<ResolvedAccountContext> {
  const tag = "[ACCOUNT_STATE]";

  // ── 1. Authentication check ─────────────────────────────────────────
  let userId: string | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const a = await auth();
    userId = a.userId ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    logger.debug(`${tag} UNAUTHENTICATED`);
    return {
      state: "UNAUTHENTICATED",
      userId: null,
      activeOrgId: null,
      activeOrgName: null,
      role: null,
      memberships: [],
      pendingInvites: [],
      isNetworkOnly: false,
      requiresOrgSelection: false,
      reason: "no-session",
    };
  }

  // ── 2. Fetch all memberships ────────────────────────────────────────
  let memberships: OrgMembership[] = [];
  try {
    const rawMemberships = await prisma.user_organizations.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: {
        Org: { select: { id: true, name: true } },
      },
    });

    // Validate each membership — ensure the org actually exists
    for (const m of rawMemberships) {
      memberships.push({
        id: m.id,
        organizationId: m.organizationId,
        role: m.role ?? "MEMBER",
        orgName: m.Org?.name ?? null,
        orgExists: !!m.Org,
      });
    }
  } catch (err) {
    logger.error(`${tag} Failed to fetch memberships`, err);
  }

  // ── 3. Fetch pending invitations ────────────────────────────────────
  let pendingInvites: PendingInvite[] = [];
  try {
    const rawInvites = await prisma.$queryRaw<
      Array<{
        id: string;
        org_id: string;
        org_name: string | null;
        role: string;
        email: string;
        expires_at: Date;
      }>
    >`
      SELECT ti.id, ti.org_id, o.name as org_name, ti.role, ti.email, ti.expires_at
      FROM team_invitations ti
      LEFT JOIN "Org" o ON o.id = ti.org_id
      WHERE ti.status = 'pending'
        AND ti.expires_at > NOW()
        AND ti.email IN (
          SELECT email FROM users WHERE "clerkUserId" = ${userId}
        )
    `;

    pendingInvites = rawInvites.map((inv) => ({
      id: inv.id,
      orgId: inv.org_id,
      orgName: inv.org_name,
      role: inv.role,
      email: inv.email,
      expiresAt: inv.expires_at,
    }));
  } catch (err) {
    // Non-fatal: table may not exist
    logger.warn(`${tag} Pending invite check failed (non-fatal):`, err);
  }

  // ── 4. Check for network-only (trades contact but no membership) ────
  let isNetworkContact = false;
  try {
    const networkRecord = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: { id: true, orgId: true },
    });
    if (networkRecord) {
      isNetworkContact = true;
    }
  } catch {
    // Non-fatal
  }

  // ── 5. Filter valid vs orphaned memberships ─────────────────────────
  const validMemberships = memberships.filter((m) => m.orgExists);
  const orphanedMemberships = memberships.filter((m) => !m.orgExists);

  if (orphanedMemberships.length > 0) {
    logger.warn(`${tag} Found ${orphanedMemberships.length} orphaned memberships for ${userId}`, {
      orphaned: orphanedMemberships.map((m) => m.organizationId),
    });
  }

  // ── 6. Determine state ──────────────────────────────────────────────

  // Multi-org: user belongs to 2+ valid orgs
  if (validMemberships.length > 1) {
    const primary = validMemberships[0];
    logger.info(`${tag} MULTI_ORG_MEMBER for ${userId} — using first org`, {
      orgs: validMemberships.map((m) => m.organizationId),
    });
    return {
      state: "MULTI_ORG_MEMBER",
      userId,
      activeOrgId: primary.organizationId,
      activeOrgName: primary.orgName,
      role: primary.role,
      memberships: validMemberships,
      pendingInvites,
      isNetworkOnly: false,
      requiresOrgSelection: true,
      reason: `${validMemberships.length} valid memberships`,
    };
  }

  // Active member: exactly 1 valid org
  if (validMemberships.length === 1) {
    const m = validMemberships[0];

    // Check if onboarding is complete
    let orgOnboardingComplete = true;
    try {
      const orgData = await prisma.org.findUnique({
        where: { id: m.organizationId },
        select: { name: true, onboarding_complete: true },
      });
      orgOnboardingComplete = orgData?.onboarding_complete ?? true;
    } catch {
      // Non-fatal
    }

    const state: AccountState = orgOnboardingComplete
      ? "ORG_MEMBER_ACTIVE"
      : ["ADMIN", "OWNER"].includes((m.role || "").toString().toUpperCase())
        ? "OWNER_NO_SETUP"
        : "ORG_MEMBER_ACTIVE"; // Non-owner members shouldn't be blocked by incomplete onboarding

    logger.debug(`${tag} ${state} for ${userId} in org ${m.organizationId}`);

    return {
      state,
      userId,
      activeOrgId: m.organizationId,
      activeOrgName: m.orgName,
      role: m.role,
      memberships: validMemberships,
      pendingInvites,
      isNetworkOnly: false,
      requiresOrgSelection: false,
      reason: `single-valid-membership`,
    };
  }

  // No valid memberships — check other states

  // Orphaned: had memberships but orgs are gone
  if (orphanedMemberships.length > 0 && validMemberships.length === 0) {
    logger.warn(`${tag} ORPHANED_MEMBERSHIP for ${userId}`);
    return {
      state: "ORPHANED_MEMBERSHIP",
      userId,
      activeOrgId: null,
      activeOrgName: null,
      role: null,
      memberships: [],
      pendingInvites,
      isNetworkOnly: isNetworkContact,
      requiresOrgSelection: false,
      reason: `${orphanedMemberships.length} orphaned memberships, 0 valid`,
    };
  }

  // Invited pending: no membership but has pending invite
  if (pendingInvites.length > 0) {
    logger.info(`${tag} INVITED_PENDING for ${userId}`);
    return {
      state: "INVITED_PENDING",
      userId,
      activeOrgId: null,
      activeOrgName: null,
      role: null,
      memberships: [],
      pendingInvites,
      isNetworkOnly: isNetworkContact,
      requiresOrgSelection: false,
      reason: `${pendingInvites.length} pending invites`,
    };
  }

  // Client/contact only: in trades network but not an org member
  if (isNetworkContact && validMemberships.length === 0) {
    logger.info(`${tag} CLIENT_CONTACT_ONLY for ${userId}`);
    return {
      state: "CLIENT_CONTACT_ONLY",
      userId,
      activeOrgId: null,
      activeOrgName: null,
      role: null,
      memberships: [],
      pendingInvites: [],
      isNetworkOnly: true,
      requiresOrgSelection: false,
      reason: "network-contact-only",
    };
  }

  // No context at all
  logger.info(`${tag} NO_ACCOUNT_CONTEXT for ${userId}`);
  return {
    state: "NO_ACCOUNT_CONTEXT",
    userId,
    activeOrgId: null,
    activeOrgName: null,
    role: null,
    memberships: [],
    pendingInvites: [],
    isNetworkOnly: false,
    requiresOrgSelection: false,
    reason: "no-memberships-no-invites-no-network",
  };
}

// =============================================================================
// CONVENIENCE: Does this state have an active org?
// =============================================================================

export function hasActiveOrg(state: AccountState): boolean {
  return (
    state === "ORG_MEMBER_ACTIVE" ||
    state === "OWNER_NO_SETUP" ||
    state === "OWNER_SETUP_COMPLETE" ||
    state === "MULTI_ORG_MEMBER"
  );
}

// =============================================================================
// CONVENIENCE: Route guard matrix
// =============================================================================

export interface RoutePolicy {
  requiresOrg: boolean;
  allowClientOnly: boolean;
  allowNoOrgReadonly: boolean;
}

/**
 * Check if a user can access a route given the policy and their account state.
 * Returns { allowed: true } or { allowed: false, redirectTo, reason }.
 */
export function checkRouteAccess(
  ctx: ResolvedAccountContext,
  policy: RoutePolicy
): { allowed: true } | { allowed: false; redirectTo: string; reason: string } {
  // Unauthenticated always redirects to sign-in
  if (ctx.state === "UNAUTHENTICATED") {
    return { allowed: false, redirectTo: "/sign-in", reason: "UNAUTHENTICATED" };
  }

  // If route doesn't require org, allow
  if (!policy.requiresOrg) {
    return { allowed: true };
  }

  // If user has active org, allow
  if (hasActiveOrg(ctx.state)) {
    return { allowed: true };
  }

  // Client-only users: check if route allows it
  if (ctx.state === "CLIENT_CONTACT_ONLY" && policy.allowClientOnly) {
    return { allowed: true };
  }

  // No org readonly: check if route allows it
  if (!ctx.activeOrgId && policy.allowNoOrgReadonly) {
    return { allowed: true };
  }

  // Determine best redirect based on state
  switch (ctx.state) {
    case "INVITED_PENDING":
      return {
        allowed: false,
        redirectTo: "/dashboard",
        reason: "INVITE_PENDING",
      };
    case "NO_ACCOUNT_CONTEXT":
      return {
        allowed: false,
        redirectTo: "/onboarding",
        reason: "NO_ACTIVE_ORG",
      };
    case "ORPHANED_MEMBERSHIP":
      return {
        allowed: false,
        redirectTo: "/dashboard",
        reason: "ORPHANED_MEMBERSHIP",
      };
    case "CLIENT_CONTACT_ONLY":
      return {
        allowed: false,
        redirectTo: "/trades",
        reason: "CLIENT_ONLY",
      };
    default:
      return {
        allowed: false,
        redirectTo: "/dashboard",
        reason: ctx.state,
      };
  }
}
