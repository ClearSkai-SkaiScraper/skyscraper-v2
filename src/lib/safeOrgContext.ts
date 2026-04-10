// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";

import { logger } from "@/lib/logger";
import { ensureOrgForUser } from "@/lib/org/ensureOrgForUser";
import prisma from "@/lib/prisma";
import { ensureWorkspaceForOrg } from "@/lib/workspace/ensureWorkspaceForOrg";

export type SafeOrgStatus = "unauthenticated" | "noMembership" | "ok" | "error";

/** Discriminated union: when ok=true, orgId & userId are guaranteed non-null */
export type SafeOrgContext =
  | {
      status: "ok";
      userId: string;
      orgId: string;
      role: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      membership: any;
      error?: null;
      ok: true;
      reason: null;
      organizationId: string;
    }
  | {
      status: "unauthenticated" | "noMembership" | "error";
      userId: string | null;
      orgId: string | null;
      role: string | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      membership: any | null;
      error?: string | null;
      ok: false;
      reason: string | null;
      organizationId: string | null;
    };

export async function safeOrgContext(): Promise<SafeOrgContext> {
  let userId: string | null = null;
  try {
    // Clerk v5 requires await
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const a = await auth();
    userId = a.userId ?? null;
  } catch {
    userId = null;
  }

  // Unauthenticated
  if (!userId) {
    return {
      status: "unauthenticated",
      userId: null,
      orgId: null,
      role: null,
      membership: null,
      ok: false,
      reason: "no-user",
      organizationId: null,
    };
  }

  // Test bypass synthetic context
  if (
    // eslint-disable-next-line no-restricted-syntax
    process.env.TEST_AUTH_BYPASS === "1" &&
    // eslint-disable-next-line no-restricted-syntax
    process.env.TEST_AUTH_USER_ID &&
    // eslint-disable-next-line no-restricted-syntax
    process.env.TEST_AUTH_ORG_ID
  ) {
    return {
      status: "ok",
      // eslint-disable-next-line no-restricted-syntax
      userId: process.env.TEST_AUTH_USER_ID,
      // eslint-disable-next-line no-restricted-syntax
      orgId: process.env.TEST_AUTH_ORG_ID,
      role: "owner",
      membership: {
        // eslint-disable-next-line no-restricted-syntax
        id: `uo_${process.env.TEST_AUTH_ORG_ID}_${process.env.TEST_AUTH_USER_ID}`,
        // eslint-disable-next-line no-restricted-syntax
        userId: process.env.TEST_AUTH_USER_ID,
        // eslint-disable-next-line no-restricted-syntax
        organizationId: process.env.TEST_AUTH_ORG_ID,
        role: "owner",
      },
      ok: true,
      reason: null,
      // eslint-disable-next-line no-restricted-syntax
      organizationId: process.env.TEST_AUTH_ORG_ID,
    };
  }

  try {
    // 1) PRIMARY SOURCE OF TRUTH: user_organizations memberships
    // CRITICAL: Use "asc" order to match orgResolver.ts and ensure consistent org selection
    const memberships = await prisma.user_organizations.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, userId: true, organizationId: true, role: true, createdAt: true },
    });

    if (memberships.length > 0) {
      for (const m of memberships) {
        if (!m.organizationId) continue;

        // Ensure the org row actually exists before using this membership
        const org = await prisma.org.findUnique({
          where: { id: m.organizationId },
          select: { id: true },
        });

        if (!org) {
          logger.warn("[SAFE_ORG_CONTEXT] Membership points to missing org row", {
            userId,
            organizationId: m.organizationId,
          });
          continue;
        }

        // 🛡️ HARDEN: Ensure workspace primitives exist (idempotent, non-blocking)
        await ensureWorkspaceForOrg({
          orgId: org.id,
          userId,
        }).catch((err) => {
          logger.error("[safeOrgContext] ensureWorkspace failed (non-fatal):", err);
        });

        const mappedMembership = {
          id: m.id,
          userId: m.userId,
          organizationId: org.id,
          role: m.role,
        };

        return {
          status: "ok",
          userId,
          orgId: org.id,
          role: m.role ?? "member",
          membership: mappedMembership,
          ok: true,
          reason: null,
          organizationId: org.id,
        };
      }

      // If we had memberships but none pointed to a valid org row,
      // treat this as a corrupted state and fall through to self-healing
      logger.warn(
        "[SAFE_ORG_CONTEXT] Memberships found but no valid Org rows; will attempt auto-onboard",
        { userId }
      );
    }

    // 2) LEGACY FALLBACK: users.orgId linkage (only when NO memberships exist)
    if (memberships.length === 0) {
      const legacyUser = await prisma.users.findUnique({
        where: { clerkUserId: userId },
        select: { id: true, orgId: true, role: true },
      });

      if (legacyUser?.orgId) {
        logger.warn(
          "[SAFE_ORG_CONTEXT] Fallback activated: using users.orgId linkage (missing UserOrganization row)"
        );

        // 🛡️ HARDEN: Ensure workspace primitives exist (idempotent, non-blocking)
        await ensureWorkspaceForOrg({
          orgId: legacyUser.orgId,
          userId,
        }).catch((err) => {
          logger.error("[safeOrgContext] ensureWorkspace failed (non-fatal):", err);
        });

        const syntheticMembership = {
          id: `synthetic_uo_${legacyUser.orgId}_${userId}`,
          userId,
          organizationId: legacyUser.orgId,
          role: legacyUser.role || "member",
          synthetic: true,
          reason: "legacy-users-orgId-fallback",
        };
        return {
          status: "ok",
          userId,
          orgId: legacyUser.orgId,
          role: legacyUser.role || "member",
          membership: syntheticMembership,
          ok: true,
          reason: null,
          organizationId: legacyUser.orgId,
        };
      }
    }

    // ── Check for pending invitations BEFORE auto-creating an org ──────
    // If the user was invited to a team but hasn't accepted yet,
    // do NOT auto-create a phantom org. Instead, return noMembership
    // so the UI can guide them to accept the invitation.
    try {
      const pendingInvites = await prisma.$queryRaw<Array<{ id: string; org_id: string }>>`
        SELECT id, org_id FROM team_invitations
        WHERE status = 'pending'
          AND expires_at > NOW()
          AND email IN (
            SELECT email FROM users WHERE "clerkUserId" = ${userId}
          )
        LIMIT 1
      `;

      if (pendingInvites.length > 0) {
        logger.info("[safeOrgContext] User has pending team invitation — skipping auto-onboard", {
          userId,
          inviteOrgId: pendingInvites[0].org_id,
        });
        return {
          status: "noMembership",
          userId,
          orgId: null,
          role: null,
          membership: null,
          ok: false,
          reason: "pending-invitation",
          organizationId: null,
        };
      }
    } catch (inviteCheckErr) {
      // Non-fatal — if the table doesn't exist or query fails, fall through
      logger.warn("[safeOrgContext] Pending invite check failed (non-fatal):", inviteCheckErr);
    }

    // Final fallback: attempt auto-onboarding (create org + membership)
    logger.debug("[safeOrgContext] No org membership found, attempting auto-onboard for:", userId);
    const ensured = await ensureOrgForUser();

    if (ensured) {
      logger.debug("[safeOrgContext] ✅ Auto-onboarded user to org:", ensured.orgId);

      // 🛡️ HARDEN: Ensure workspace primitives exist (idempotent, non-blocking)
      await ensureWorkspaceForOrg({
        orgId: ensured.orgId,
        userId,
      }).catch((err) => {
        logger.error("[safeOrgContext] ensureWorkspace failed (non-fatal):", err);
      });

      return {
        status: "ok",
        userId,
        orgId: ensured.orgId,
        role: ensured.role,
        membership: {
          id: `auto_${ensured.orgId}_${userId}`,
          userId,
          organizationId: ensured.orgId,
          role: ensured.role,
        },
        ok: true,
        reason: null,
        organizationId: ensured.orgId,
      };
    }

    // Auto-onboarding failed (should be rare)
    logger.error("[SAFE_ORG_CONTEXT] Auto-onboarding failed for user", { userId });
    return {
      status: "noMembership",
      userId,
      orgId: null,
      role: null,
      membership: null,
      ok: false,
      reason: "auto-onboard-failed",
      organizationId: null,
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    logger.error("[SAFE_ORG_CONTEXT] Membership lookup failed", { error: e?.message, userId });
    return {
      status: "error",
      userId,
      orgId: null,
      role: null,
      membership: null,
      error: e?.message || "membership lookup failed",
      ok: false,
      reason: "error",
      organizationId: null,
    };
  }
}

// Backwards compatibility type alias (optional external imports relying on old union)
export type SafeOrgContextResult = SafeOrgContext;

/** Convenience type for the "ok" branch of SafeOrgContext */
export type SafeOrgOk = Extract<SafeOrgContext, { ok: true }>;

/**
 * requireSafeOrg — call safeOrgContext, redirect if not ok, return narrowed type.
 * Use this in server components / pages instead of the manual check pattern.
 * TypeScript reliably narrows the return type to { orgId: string; userId: string; ... }
 */
export async function requireSafeOrg(redirectTo = "/sign-in"): Promise<SafeOrgOk> {
  const ctx = await safeOrgContext();
  if (!ctx.ok || !ctx.orgId || !ctx.userId) {
    // Dynamic import to avoid circular deps in non-Next contexts
    const { redirect } = await import("next/navigation");
    redirect(redirectTo);
  }
  return ctx as SafeOrgOk;
}
