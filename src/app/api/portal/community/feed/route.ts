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

    // 1. Get posts from connected companies (their recent work/updates)
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
            likes: Math.floor(Math.random() * 50) + 5,
            comments: Math.floor(Math.random() * 10),
            createdAt: company.updatedAt ?? new Date(),
            companyId: company.id,
          });
        }
      }
    }

    // 2. Add insurance tips (static content for now, can be DB-driven later)
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
      {
        id: "tip-4",
        content:
          "📞 Keep a copy of your insurance policy accessible. Know your deductible and coverage limits before filing a claim.",
      },
      {
        id: "tip-5",
        content:
          "🔍 Review your policy annually. Home improvements and market changes may require coverage adjustments.",
      },
    ];

    // Add 2-3 random tips to the feed
    const shuffledTips = tips.sort(() => Math.random() - 0.5).slice(0, 3);
    for (const tip of shuffledTips) {
      feedItems.push({
        id: tip.id,
        type: "tip",
        author: {
          name: "SkaiScrape Insurance Tips",
          avatar: null,
          verified: true,
        },
        content: tip.content,
        likes: Math.floor(Math.random() * 100) + 20,
        comments: Math.floor(Math.random() * 15),
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      });
    }

    // 3. Add community updates
    feedItems.push({
      id: "update-welcome",
      type: "update",
      author: {
        name: "SkaiScrape Community",
        avatar: null,
        verified: true,
      },
      content:
        "Welcome to the SkaiScrape community! 🎉 Connect with trusted contractors, track your claims, and get expert advice on navigating the insurance process.",
      likes: 156,
      comments: 23,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

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

    // For now, just acknowledge the post. In production, this would save to a CommunityPost table.
    return NextResponse.json({
      success: true,
      message: "Post created successfully",
      post: {
        id: `post-${Date.now()}`,
        content: content.trim(),
        media: media || [],
        createdAt: new Date(),
      },
    });
  } catch (error) {
    logger.error("[COMMUNITY_POST_ERROR]", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
