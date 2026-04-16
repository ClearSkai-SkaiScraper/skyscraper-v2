/**
 * Manager-Scoped Data Visibility
 *
 * Resolves which user IDs (Clerk IDs) a caller can see based on their role:
 *  - admin / owner  → null (see everything in the org)
 *  - manager        → own userId + direct reports' userIds
 *  - member / other → own userId only
 *
 * Returns null when no filter should be applied (admin/owner sees all).
 * Returns string[] of clerkUserIds when scoping is needed.
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { isAdminRole, roleEquals } from "@/lib/auth/roleCompare";

export async function getVisibleUserIds(
  clerkUserId: string,
  orgId: string
): Promise<string[] | null> {
  try {
    // 1. Look up the caller in tradesCompanyMember (has manager hierarchy)
    const member = await prisma.tradesCompanyMember.findFirst({
      where: { userId: clerkUserId },
      select: {
        id: true,
        role: true,
        isAdmin: true,
        isOwner: true,
        isManager: true,
      },
    });

    // 2. If admin or owner → no filter (see everything)
    if (member?.isAdmin || member?.isOwner || isAdminRole(member?.role)) {
      return null;
    }

    // 3. Fall back to Users table for role check
    if (!member) {
      const dbUser = await prisma.users.findFirst({
        where: { clerkUserId, orgId },
        select: { role: true },
      });
      if (isAdminRole(dbUser?.role)) {
        return null;
      }
      // Non-admin without tradesCompanyMember record → own data only
      return [clerkUserId];
    }

    // 4. Manager → own userId + direct reports' userIds
    if (member.isManager || roleEquals(member.role, "manager")) {
      const directReports = await prisma.tradesCompanyMember.findMany({
        where: { managerId: member.id },
        select: { userId: true },
      });
      const visibleIds = [clerkUserId, ...directReports.map((r) => r.userId)];
      return visibleIds;
    }

    // 5. Regular member → own data only
    return [clerkUserId];
  } catch (error) {
    logger.error("[MANAGER_SCOPE] Error resolving visible user IDs", error);
    // On error, fall back to own data only for safety
    return [clerkUserId];
  }
}
