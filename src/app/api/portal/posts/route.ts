export const dynamic = "force-dynamic";

/**
 * Portal Posts API
 * Handle client social posts — uses community_posts Prisma model
 */

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// GET /api/portal/posts - List posts for current user or specific user
export async function GET(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const posts = await prisma.community_posts.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        post_likes: { where: { userId }, select: { id: true } },
        _count: { select: { post_likes: true, post_comments: true } },
      },
    });

    return NextResponse.json({
      posts: posts.map((post) => ({
        id: post.id,
        type: post.type,
        content: post.content,
        images: [],
        likeCount: post._count.post_likes,
        commentCount: post._count.post_comments,
        isLiked: post.post_likes.length > 0,
        createdAt: post.createdAt,
      })),
    });
  } catch (error) {
    logger.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

// POST /api/portal/posts - Create a new post
export async function POST(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type = "update", content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const post = await prisma.community_posts.create({
      data: {
        authorId: userId,
        content: content.trim(),
        type,
      },
    });

    return NextResponse.json({
      post: {
        id: post.id,
        type: post.type,
        content: post.content,
        images: [],
        likeCount: 0,
        commentCount: 0,
        isLiked: false,
        createdAt: post.createdAt,
      },
    });
  } catch (error) {
    logger.error("Error creating post:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
