/**
 * Trades Feed API
 *
 * GET  /api/trades/feed — Fetch feed posts for the authenticated user
 * POST /api/trades/feed — Create a new feed post
 *
 * NOTE: Prisma schema has two TradesPost models (PascalCase + camelCase).
 * The runtime DB table matches the camelCase model (companyId, postType, isActive).
 * We cast `prisma.tradesPost as any` to bypass the TS mismatch — same pattern
 * used in /network/trades/page.tsx.
 */

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tradesPostModel = prisma.tradesPost as any;

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");
    const type = searchParams.get("type"); // "update" | "project" | "opportunity" | "article"

    // Build where filter
    const where: Record<string, unknown> = {
      isActive: true,
    };
    if (type && type !== "all") {
      where.postType = type;
    }

    const posts: any[] = await tradesPostModel.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        tradesCompany: {
          select: {
            id: true,
            name: true,
            logo: true,
            isVerified: true,
          },
        },
      },
    });

    // Get engagement data for current user
    const postIds = posts.map((p: any) => p.id);
    const engagements: any[] = postIds.length
      ? await prisma.trades_feed_engagement
          .findMany({
            where: {
              post_id: { in: postIds },
              user_id: userId,
            },
          })
          .catch(() => [])
      : [];

    const engagementMap = new Map(engagements.map((e: any) => [e.post_id, e]));

    const formattedPosts = posts.map((post: any) => {
      const engagement = engagementMap.get(post.id);
      return {
        id: post.id,
        authorId: post.authorId,
        authorName: post.tradesCompany?.name || "Unknown",
        authorLogo: post.tradesCompany?.logo || null,
        authorVerified: post.tradesCompany?.isVerified || false,
        content: post.content || "",
        title: post.title,
        imageUrl: post.images?.[0] || null,
        images: post.images || [],
        tags: post.tags || [],
        postType: post.postType || "update",
        likes: 0,
        comments: 0,
        shares: 0,
        hasLiked: engagement?.liked || false,
        createdAt: post.createdAt,
      };
    });

    return NextResponse.json({ posts: formattedPosts, total: formattedPosts.length });
  } catch (error) {
    logger.error("[GET /api/trades/feed]", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content, type, title, images, tags, postAs } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Get the user's company membership
    let member = await prisma.tradesCompanyMember
      .findUnique({
        where: { userId },
        select: {
          id: true,
          companyId: true,
          companyName: true,
          firstName: true,
          lastName: true,
          isOwner: true,
          isAdmin: true,
          role: true,
          company: {
            select: { id: true, name: true, logo: true, isVerified: true },
          },
        },
      })
      .catch(() => null);

    // Auto-create trades member if none exists (first-time poster)
    if (!member) {
      // Get basic user info from the users table
      const dbUser = await prisma.users
        .findFirst({
          where: { clerkUserId: userId },
          select: { name: true, email: true, orgId: true },
        })
        .catch(() => null);

      try {
        const newMember = await prisma.tradesCompanyMember.create({
          data: {
            userId,
            firstName: dbUser?.name?.split(" ")[0] || "User",
            lastName: dbUser?.name?.split(" ").slice(1).join(" ") || "",
            email: dbUser?.email || "",
            role: "member",
            isOwner: false,
            isAdmin: false,
            isActive: true,
            status: "active",
          },
        });
        member = {
          id: newMember.id,
          companyId: null,
          companyName: null,
          firstName: newMember.firstName,
          lastName: newMember.lastName,
          isOwner: false,
          isAdmin: false,
          role: "member",
          company: null,
        };
        logger.info("[POST /api/trades/feed] Auto-created trades member for:", userId);
      } catch (createErr) {
        logger.warn("[POST /api/trades/feed] Could not auto-create member:", createErr);
        // Continue without company association
      }
    }

    const companyId = member?.companyId || null;

    // Determine display identity: "company" or "personal"
    const isAdmin =
      member?.isOwner || member?.isAdmin || member?.role === "owner" || member?.role === "admin";
    const useCompanyIdentity = postAs === "company" && isAdmin && companyId;

    const authorDisplayName = useCompanyIdentity
      ? member?.company?.name || member?.companyName || "Company"
      : `${member?.firstName || ""} ${member?.lastName || ""}`.trim() || "You";

    const post: any = await tradesPostModel.create({
      data: {
        authorId: userId,
        companyId: companyId,
        title: title || content.trim().slice(0, 100),
        content: content.trim(),
        images: images || [],
        tags: tags || [],
        postType: type || "update",
        isActive: true,
      },
      include: {
        tradesCompany: {
          select: {
            id: true,
            name: true,
            logo: true,
            isVerified: true,
          },
        },
      },
    });

    return NextResponse.json({
      post: {
        id: post.id,
        authorId: post.authorId,
        authorName: post.tradesCompany?.name || authorDisplayName,
        authorLogo: post.tradesCompany?.logo || null,
        authorVerified: post.tradesCompany?.isVerified || false,
        postAs: useCompanyIdentity ? "company" : "personal",
        content: post.content,
        title: post.title,
        imageUrl: post.images?.[0] || null,
        images: post.images || [],
        tags: post.tags || [],
        postType: post.postType,
        likes: 0,
        comments: 0,
        shares: 0,
        hasLiked: false,
        createdAt: post.createdAt,
      },
    });
  } catch (error) {
    logger.error("[POST /api/trades/feed]", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
