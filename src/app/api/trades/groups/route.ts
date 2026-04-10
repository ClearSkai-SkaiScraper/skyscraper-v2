export const dynamic = "force-dynamic";

// ORG-SCOPE: Public marketplace data — cross-org by design
// GET lists public/private groups for discovery (myGroups mode filters by userId membership).
// POST creates groups scoped to the authenticated user as creator.
// tradesGroup has no orgId; groups are cross-org communities of trades professionals.

/**
 * Trades Groups API
 * Handles CRUD operations for trades professional groups
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Helper to generate slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);
}

// GET - List groups or get single group
export async function GET(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("id");
    const slug = searchParams.get("slug");
    const category = searchParams.get("category");
    const myGroups = searchParams.get("myGroups") === "true";

    // Single group by ID or slug
    if (groupId || slug) {
      const group = await prisma.tradesGroup.findFirst({
        where: groupId ? { id: groupId } : { slug: slug! },
        include: {
          tradesGroupMember: {
            take: 10,
            orderBy: { joinedAt: "desc" },
          },
          tradesGroupPost: {
            take: 5,
            orderBy: { createdAt: "desc" },
            where: { isActive: true },
          },
        },
      });

      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }

      // Check if current user is a member
      let membership: any = null;
      if (userId) {
        membership = await prisma.tradesGroupMember.findUnique({
          where: { groupId_userId: { groupId: group.id, userId } },
        });
      }

      // Fetch member profiles
      const memberUserIds = group.tradesGroupMember.map((m) => m.userId);
      const memberProfiles = await prisma.tradesCompanyMember.findMany({
        where: { userId: { in: memberUserIds } },
        select: {
          userId: true,
          firstName: true,
          lastName: true,
          avatar: true,
          tradeType: true,
        },
      });

      const membersWithProfiles = group.tradesGroupMember.map((m) => ({
        ...m,
        profile: memberProfiles.find((p) => p.userId === m.userId) || null,
      }));

      return NextResponse.json({
        group: {
          ...group,
          members: membersWithProfiles,
          isMember: !!membership,
          memberRole: membership?.role || null,
        },
      });
    }

    // List groups
    const where: any = { isActive: true };

    if (category) {
      where.category = category;
    }

    if (myGroups && userId) {
      const userMemberships = await prisma.tradesGroupMember.findMany({
        where: { userId, status: "active" },
        select: { groupId: true },
      });
      where.id = { in: userMemberships.map((m) => m.groupId) };
    } else {
      // Only show public groups to non-members
      where.privacy = { in: ["public", "private"] };
    }

    const groups = await prisma.tradesGroup.findMany({
      where,
      orderBy: { memberCount: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        coverImage: true,
        iconImage: true,
        category: true,
        privacy: true,
        memberCount: true,
        postCount: true,
        createdAt: true,
      },
    });

    // Check membership for each group if user is logged in
    let groupsWithMembership = groups;
    if (userId) {
      const memberships = await prisma.tradesGroupMember.findMany({
        where: {
          userId,
          groupId: { in: groups.map((g) => g.id) },
          status: "active",
        },
        select: { groupId: true, role: true },
      });

      const membershipMap = new Map(memberships.map((m) => [m.groupId, m.role]));

      groupsWithMembership = groups.map((g) => ({
        ...g,
        isMember: membershipMap.has(g.id),
        memberRole: membershipMap.get(g.id) || null,
      }));
    }

    return NextResponse.json({ groups: groupsWithMembership });
  } catch (error) {
    logger.error("GET /api/trades/groups error:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

// POST - Create a new group
export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const { name, description, category, privacy, rules, coverImage, iconImage } = body;

    if (!name) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    // Generate unique slug
    let slug = generateSlug(name);
    const existing = await prisma.tradesGroup.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Create group
    const group = await prisma.tradesGroup.create({
      data: {
        name,
        slug,
        description: description || null,
        category: category || null,
        privacy: privacy || "public",
        rules: rules || null,
        coverImage: coverImage || null,
        iconImage: iconImage || null,
        createdById: userId,
        memberCount: 1,
      },
    });

    // Add creator as admin member
    await prisma.tradesGroupMember.create({
      data: {
        groupId: group.id,
        userId,
        role: "admin",
        status: "active",
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error: unknown) {
    logger.error("POST /api/trades/groups error:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
});

// PATCH - Update a group
export const PATCH = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const { groupId, name, description, category, privacy, rules, coverImage, iconImage } = body;

    if (!groupId) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }

    // Check if user is admin
    const membership = await prisma.tradesGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!membership || !["admin", "moderator"].includes(membership.role)) {
      return NextResponse.json({ error: "Not authorized to edit this group" }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (privacy !== undefined) updateData.privacy = privacy;
    if (rules !== undefined) updateData.rules = rules;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (iconImage !== undefined) updateData.iconImage = iconImage;

    const group = await prisma.tradesGroup.update({
      where: { id: groupId },
      data: updateData,
    });

    return NextResponse.json({ group });
  } catch (error: unknown) {
    logger.error("PATCH /api/trades/groups error:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
});

// DELETE - Delete a group
export const DELETE = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("id");

    if (!groupId) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }

    // Check if user is admin
    const group = await prisma.tradesGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.createdById !== userId) {
      return NextResponse.json({ error: "Only the group creator can delete it" }, { status: 403 });
    }

    // Soft delete
    await prisma.tradesGroup.update({
      where: { id: groupId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error("DELETE /api/trades/groups error:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
});
