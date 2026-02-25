import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

/**
 * GET /api/team/members
 * Returns all team members for the current organization.
 *
 * Sprint 27: Fixed to guarantee the current user always appears in the list,
 * and to merge data from both user_organizations + tradesCompanyMember tables
 * (whichever has richer profile data) so names & avatars always show.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();

    // ── Strategy 1: user_organizations + users table ─────────────
    const orgUsers = await prisma.user_organizations.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: "desc" },
    });

    const userIds = orgUsers.map((ou) => ou.userId);

    // Also try to match by clerkUserId (some users table rows use that field)
    const [usersById, usersByClerk] = await Promise.all([
      prisma.users.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, headshot_url: true, clerkUserId: true },
      }),
      prisma.users.findMany({
        where: { clerkUserId: { in: userIds } },
        select: { id: true, name: true, email: true, headshot_url: true, clerkUserId: true },
      }),
    ]);

    // Merge lookup: key = userId from user_organizations
    const userMap = new Map<
      string,
      { name: string | null; email: string | null; avatarUrl: string | null }
    >();

    for (const u of usersById) {
      userMap.set(u.id, { name: u.name, email: u.email, avatarUrl: u.headshot_url });
    }
    for (const u of usersByClerk) {
      if (u.clerkUserId && !userMap.has(u.clerkUserId)) {
        userMap.set(u.clerkUserId, { name: u.name, email: u.email, avatarUrl: u.headshot_url });
      }
    }

    // ── Strategy 2: tradesCompanyMember (richer profile data) ────
    // Get the current user's company, then all active members
    let companyMembers: any[] = [];
    try {
      const membership = ctx.userId
        ? await prisma.tradesCompanyMember.findUnique({
            where: { userId: ctx.userId },
            select: { companyId: true },
          })
        : null;

      if (membership?.companyId) {
        companyMembers = await prisma.tradesCompanyMember.findMany({
          where: {
            companyId: membership.companyId,
            isActive: true,
          },
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            profilePhoto: true,
            isAdmin: true,
            isManager: true,
            role: true,
          },
        });
      }
    } catch {
      // tradesCompanyMember lookup is supplementary
    }

    // Create supplementary lookup from tradesCompanyMember
    const tradesMemberMap = new Map(companyMembers.map((m) => [m.userId, m]));

    // ── Merge: build final member list ───────────────────────────
    const seenIds = new Set<string>();
    const formattedMembers: Array<{
      id: string;
      name: string | null;
      email: string;
      role: string;
      avatarUrl: string | null;
    }> = [];

    // First: add all user_organizations members
    for (const ou of orgUsers) {
      seenIds.add(ou.userId);
      const userRow = userMap.get(ou.userId);
      const tradeRow = tradesMemberMap.get(ou.userId);

      // Prefer tradesCompanyMember name (first+last) over users.name
      const tradeName = tradeRow
        ? [tradeRow.firstName, tradeRow.lastName].filter(Boolean).join(" ") || null
        : null;

      const role = tradeRow?.isAdmin
        ? "Admin"
        : tradeRow?.isManager
          ? "Manager"
          : ou.role || "member";

      formattedMembers.push({
        id: ou.userId,
        name: tradeName || userRow?.name || null,
        email: tradeRow?.email || userRow?.email || "Unknown",
        role,
        avatarUrl: tradeRow?.avatar || tradeRow?.profilePhoto || userRow?.avatarUrl || null,
      });
    }

    // Second: add tradesCompanyMember rows not already in user_organizations
    for (const tm of companyMembers) {
      if (!seenIds.has(tm.userId)) {
        seenIds.add(tm.userId);
        formattedMembers.push({
          id: tm.userId,
          name: [tm.firstName, tm.lastName].filter(Boolean).join(" ") || null,
          email: tm.email || "Unknown",
          role: tm.isAdmin ? "Admin" : tm.isManager ? "Manager" : tm.role || "member",
          avatarUrl: tm.avatar || tm.profilePhoto || null,
        });
      }
    }

    // ── Guarantee current user is always in the list ─────────────
    if (ctx.userId && !seenIds.has(ctx.userId)) {
      const clerkEmail =
        clerkUser?.emailAddresses?.[0]?.emailAddress ||
        clerkUser?.primaryEmailAddress?.emailAddress;
      const clerkName = clerkUser
        ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null
        : null;

      formattedMembers.unshift({
        id: ctx.userId,
        name: clerkName || "You",
        email: clerkEmail || "Unknown",
        role: "Admin",
        avatarUrl: clerkUser?.imageUrl || null,
      });
    }

    return NextResponse.json({
      ok: true,
      members: formattedMembers,
      source: "merged",
    });
  } catch (error) {
    const message = "Failed to fetch team members";
    logger.error("[GET /api/team/members] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
