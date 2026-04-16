/**
 * GET /api/remote-view/team
 *
 * Returns the list of team members the current user can view.
 * - Admin/Owner: all org members
 * - Manager: direct reports only
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import { canUseRemoteView, hasMinRole, normalizeRole } from "@/lib/permissions/constants";
import { resolveUserRole } from "@/lib/permissions/server";
import prisma from "@/lib/prisma";

export const GET = withOrgScope(async (req, { userId, orgId }) => {
  try {
    const user = await resolveUserRole();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!canUseRemoteView(user.role)) {
      return NextResponse.json(
        { error: "Remote View requires manager role or higher" },
        { status: 403 }
      );
    }

    // Get caller's tradesCompanyMember record (for managerId hierarchy)
    const callerMember = await prisma.tradesCompanyMember.findFirst({
      where: { userId: user.userId },
      select: { id: true, companyId: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let companyMembers: any[] = [];

    if (callerMember?.companyId) {
      if (hasMinRole(user.role, "admin")) {
        // Admin/Owner: see all company members except self
        companyMembers = await prisma.tradesCompanyMember.findMany({
          where: {
            companyId: callerMember.companyId,
            isActive: true,
            userId: { not: user.userId },
          },
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isAdmin: true,
            isManager: true,
            managerId: true,
            avatar: true,
            profilePhoto: true,
          },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        });
      } else {
        // Manager: only direct reports (managerId stores member UUID, not Clerk userId)
        companyMembers = await prisma.tradesCompanyMember.findMany({
          where: {
            companyId: callerMember.companyId,
            isActive: true,
            managerId: callerMember.id,
          },
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isAdmin: true,
            isManager: true,
            managerId: true,
            avatar: true,
            profilePhoto: true,
          },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        });
      }
    } else {
      // Fallback: use user_organizations if no trades company
      const orgMembers = await prisma.user_organizations.findMany({
        where: {
          organizationId: user.orgId,
          userId: { not: user.userId },
        },
        select: {
          userId: true,
          role: true,
        },
      });

      companyMembers = orgMembers.map((m) => ({
        userId: m.userId,
        firstName: null,
        lastName: null,
        email: m.userId, // fallback
        role: m.role,
        isAdmin: false,
        isManager: false,
        managerId: null,
        avatar: null,
        profilePhoto: null,
      }));
    }

    const members = companyMembers.map((m) => ({
      userId: m.userId,
      name: [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email || "Unknown",
      email: m.email || "",
      role: m.isAdmin ? "Admin" : m.isManager ? "Manager" : normalizeRole(m.role),
      avatarUrl: m.avatar || m.profilePhoto || null,
      isManager: m.isManager || false,
      managerId: m.managerId || null,
    }));

    return NextResponse.json({ members });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("[RemoteView] Team fetch failed:", error);
    return NextResponse.json({ error: "Failed to load team members" }, { status: 500 });
  }
});
