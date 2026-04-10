/**
 * Sprint 27 — Remote View server utilities
 *
 * Provides helpers to detect Remote View mode and scope data queries
 * to the viewed user instead of the authenticated user.
 *
 * Usage in server components / API routes:
 *
 * ```ts
 * import { getEffectiveUserId } from "@/lib/permissions/remoteView";
 *
 * const { effectiveUserId, isRemoteView } = await getEffectiveUserId();
 * // effectiveUserId = the viewed user's ID (or the real user's ID if not in RV)
 * // isRemoteView = true if viewing as another user
 * ```
 */

import { cookies } from "next/headers";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

import { canUseRemoteView, hasMinRole } from "./constants";
import { resolveUserRole } from "./server";

const COOKIE_NAME = "x-remote-view-user";

/**
 * Get the effective user ID for data scoping.
 * In Remote View mode, returns the target user's ID.
 * Otherwise returns the authenticated user's ID.
 */
export async function getEffectiveUserId(): Promise<{
  /** The user ID to use for data queries */
  effectiveUserId: string;
  /** The real authenticated user's ID */
  realUserId: string;
  /** Organization ID */
  orgId: string;
  /** Whether Remote View is active */
  isRemoteView: boolean;
}> {
  const user = await resolveUserRole();
  if (!user) {
    throw Object.assign(new Error("Authentication required"), { statusCode: 401 });
  }

  // Check for Remote View cookie
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const cookieStore = await cookies();
  const remoteViewUserId = cookieStore.get(COOKIE_NAME)?.value;

  if (remoteViewUserId && remoteViewUserId !== user.userId) {
    // Validate the caller still has permission
    if (!canUseRemoteView(user.role)) {
      logger.warn("[RemoteView] User lost RV permission, clearing", {
        userId: user.userId,
        role: user.role,
      });
      return {
        effectiveUserId: user.userId,
        realUserId: user.userId,
        orgId: user.orgId,
        isRemoteView: false,
      };
    }

    // Verify target is still in the same org
    const targetOrg = await prisma.user_organizations.findFirst({
      where: {
        userId: remoteViewUserId,
        organizationId: user.orgId,
      },
      select: { id: true },
    });

    if (!targetOrg) {
      logger.warn("[RemoteView] Target not in org, ignoring", {
        target: remoteViewUserId,
        orgId: user.orgId,
      });
      return {
        effectiveUserId: user.userId,
        realUserId: user.userId,
        orgId: user.orgId,
        isRemoteView: false,
      };
    }

    // If manager (not admin), verify direct report
    if (!hasMinRole(user.role, "admin")) {
      const callerMember = await prisma.tradesCompanyMember.findFirst({
        where: { userId: user.userId },
        select: { id: true },
      });

      const isDirectReport = await prisma.tradesCompanyMember.findFirst({
        where: {
          userId: remoteViewUserId,
          OR: [
            { managerId: user.userId },
            ...(callerMember ? [{ managerId: callerMember.id }] : []),
          ],
        },
        select: { id: true },
      });

      if (!isDirectReport) {
        logger.warn("[RemoteView] Manager viewing non-report, ignoring", {
          manager: user.userId,
          target: remoteViewUserId,
        });
        return {
          effectiveUserId: user.userId,
          realUserId: user.userId,
          orgId: user.orgId,
          isRemoteView: false,
        };
      }
    }

    return {
      effectiveUserId: remoteViewUserId,
      realUserId: user.userId,
      orgId: user.orgId,
      isRemoteView: true,
    };
  }

  return {
    effectiveUserId: user.userId,
    realUserId: user.userId,
    orgId: user.orgId,
    isRemoteView: false,
  };
}

/**
 * Guard: Reject mutations when in Remote View mode.
 * Use this at the top of POST/PUT/PATCH/DELETE handlers.
 */
export async function blockIfRemoteView(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const cookieStore = await cookies();
  const remoteViewUserId = cookieStore.get(COOKIE_NAME)?.value;
  if (remoteViewUserId) {
    throw Object.assign(new Error("Mutations are disabled in Remote View mode"), {
      statusCode: 403,
    });
  }
}
