import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

/**
 * GET /api/team/members
 * Returns all team members for the current organization
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user_organizations for the org
    const orgUsers = await prisma.user_organizations.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: "desc" },
    });

    // Get user details for each member
    const userIds = orgUsers.map((ou) => ou.userId);
    const users = await prisma.users.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        headshot_url: true,
      },
    });

    // Create a lookup map for users
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Transform to cleaner format
    const formattedMembers = orgUsers.map((ou) => {
      const user = userMap.get(ou.userId);
      return {
        id: ou.userId,
        name: user?.name || null,
        email: user?.email || "Unknown",
        role: ou.role || "member",
        avatarUrl: user?.headshot_url || null,
      };
    });

    return NextResponse.json({
      ok: true,
      members: formattedMembers,
      source: "user_organizations",
    });
  } catch (error) {
    const message = "Failed to fetch team members";
    logger.error("[GET /api/team/members] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
