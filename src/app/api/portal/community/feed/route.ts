import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/portal/community/feed
 * Returns community feed posts for the client portal.
 * Shows posts from connected pros, insurance tips, and community updates.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const cursor = searchParams.get("cursor");

    // Find the client record
    const client = await prisma.client.findFirst({
      where: { userId },
      select: { id: true },
    });

    // Get connected companies
    const connections = client
      ? await prisma.clientProConnection.findMany({
          where: { clientId: client.id, status: "accepted" },
          select: { contractorId: true },
        })
      : [];

    const connectedCompanyIds = connections.map((c) => c.contractorId);

    // Build feed from multiple sources
    const feedItems: Array<{
      id: string;
      type: "post" | "tip" | "update" | "showcase";
      author: { name: string; avatar?: string | null; verified?: boolean };
      content: string;
      media?: string[];
      likes: number;
      comments: number;
      createdAt: Date;
      companyId?: string;
    }> = [];

    // 1. Get user-created community posts from DB
    const communityPosts = await prisma.community_posts.findMany({
      where: { isHidden: false },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        post_likes: { where: { userId }, select: { id: true } },
        _count: { select: { post_likes: true, post_comments: true } },
      },
    });

    // Batch author lookup — avoid N+1 queries
    const authorIds = [...new Set(communityPosts.map((p) => p.authorId))];
    const authorClients = await prisma.client.findMany({
      where: { userId: { in: authorIds } },
      select: { userId: true, name: true },
    });
    const authorMap = new Map(authorClients.map((c) => [c.userId, c.name]));

    for (const post of communityPosts) {
      const authorName = authorMap.get(post.authorId) || "Community Member";

      feedItems.push({
        id: post.id,
        type: (post.type as "post" | "tip" | "update" | "showcase") || "post",
        author: { name: authorName, avatar: null, verified: false },
        content: post.content,
        media: (post.mediaUrls as string[]) || [],
        likes: post._count.post_likes,
        comments: post._count.post_comments,
        createdAt: post.createdAt,
      });
    }

    // 2. Get posts from connected companies (their recent work/updates)
    if (connectedCompanyIds.length > 0) {
      const companyProfiles = await prisma.tradesCompany.findMany({
        where: { id: { in: connectedCompanyIds } },
        select: {
          id: true,
          name: true,
          logo: true,
          isVerified: true,
          description: true,
          updatedAt: true,
        },
      });

      for (const company of companyProfiles) {
        if (company.description) {
          feedItems.push({
            id: `company-${company.id}`,
            type: "showcase",
            author: {
              name: company.name,
              avatar: company.logo,
              verified: company.isVerified ?? false,
            },
            content: company.description,
            likes: 0,
            comments: 0,
            createdAt: company.updatedAt ?? new Date(),
            companyId: company.id,
          });
        }
      }
    }

    // 3. Add a few static tips (clearly marked as platform tips)
    const tips = [
      {
        id: "tip-1",
        content:
          "📋 Pro Tip: Always document damage immediately after a storm with photos and video. Timestamp everything!",
      },
      {
        id: "tip-2",
        content:
          "🏠 Did you know? Most homeowner policies cover wind and hail damage, but flood damage requires separate coverage.",
      },
      {
        id: "tip-3",
        content:
          "💡 Getting multiple estimates from licensed contractors helps ensure you receive fair compensation for repairs.",
      },
    ];

    // Only show tips if there are few real posts
    if (feedItems.length < 5) {
      for (const tip of tips.slice(0, 2)) {
        feedItems.push({
          id: tip.id,
          type: "tip",
          author: { name: "SkaiScrape Insurance Tips", avatar: null, verified: true },
          content: tip.content,
          likes: 0,
          comments: 0,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        });
      }
    }

    // Sort by date and apply pagination
    feedItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const startIndex = cursor ? feedItems.findIndex((f) => f.id === cursor) + 1 : 0;
    const paginatedItems = feedItems.slice(startIndex, startIndex + limit);
    const nextCursor =
      paginatedItems.length === limit ? paginatedItems[paginatedItems.length - 1]?.id : null;

    return NextResponse.json({
      posts: paginatedItems,
      nextCursor,
      total: feedItems.length,
    });
  } catch (error) {
    logger.error("[COMMUNITY_FEED_ERROR]", error);
    return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
  }
}

/**
 * POST /api/portal/community/feed
 * Create a new community post (for connected pros sharing updates)
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content, media } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Persist the post to the community_posts table
    const post = await prisma.community_posts.create({
      data: {
        authorId: userId,
        content: content.trim(),
        type: body.type || "text",
        mediaUrls: media || [],
      },
    });

    return NextResponse.json({
      success: true,
      message: "Post created successfully",
      post: {
        id: post.id,
        content: post.content,
        media: post.mediaUrls,
        createdAt: post.createdAt,
      },
    });
  } catch (error) {
    logger.error("[COMMUNITY_POST_ERROR]", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
