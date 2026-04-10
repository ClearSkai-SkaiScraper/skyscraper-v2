/**
 * POST /api/remote-view/start
 *
 * Validates that the calling user has permission to view the target user.
 * - owner/admin: can view anyone in their org
 * - manager: can only view direct reports
 *
 * Sets a server-side cookie for downstream data scoping.
 */

export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { canUseRemoteView, hasMinRole } from "@/lib/permissions/constants";
import { resolveUserRole } from "@/lib/permissions/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
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

    const body = await req.json();
    const targetUserId = body.targetUserId;

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
    }

    // Prevent viewing yourself
    if (targetUserId === user.userId) {
      return NextResponse.json({ error: "Cannot Remote View yourself" }, { status: 400 });
    }

    // Verify target user is in the same org
    const targetMembership = await prisma.user_organizations.findFirst({
      where: {
        userId: targetUserId,
        organizationId: user.orgId,
      },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "Target user not found in your organization" },
        { status: 404 }
      );
    }

    // If manager (not admin/owner), verify the target is a direct report
    if (!hasMinRole(user.role, "admin")) {
      // managerId stores the tradesCompanyMember.id (UUID), not the Clerk userId string
      const callerMember = await prisma.tradesCompanyMember.findFirst({
        where: { userId: user.userId },
        select: { id: true },
      });

      if (!callerMember) {
        return NextResponse.json({ error: "Your company profile was not found" }, { status: 404 });
      }

      const isDirectReport = await prisma.tradesCompanyMember.findFirst({
        where: {
          userId: targetUserId,
          managerId: callerMember.id,
        },
        select: { id: true },
      });

      if (!isDirectReport) {
        return NextResponse.json(
          { error: "Managers can only view their direct reports" },
          { status: 403 }
        );
      }
    }

    // Set server-side cookie
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const cookieStore = await cookies();
    cookieStore.set("x-remote-view-user", targetUserId, {
      path: "/",
      maxAge: 3600, // 1 hour max
      httpOnly: true,
      sameSite: "lax",
      // eslint-disable-next-line no-restricted-syntax
      secure: process.env.NODE_ENV === "production",
    });

    logger.info("[RemoteView] Started", {
      viewer: user.userId,
      viewerRole: user.role,
      target: targetUserId,
      orgId: user.orgId,
    });

    return NextResponse.json({ ok: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("[RemoteView] Start failed:", error);
    return NextResponse.json({ error: "Failed to start Remote View" }, { status: 500 });
  }
}
