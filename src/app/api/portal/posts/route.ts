export const dynamic = "force-dynamic";

/**
 * Portal Posts API
 * Handle client social posts - create, list, and manage posts
 */

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

// GET /api/portal/posts - List posts for current user or specific user
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId") || userId;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Get user from user_registry (works for both client & pro users)
    const registry = await prisma.user_registry.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, orgId: true },
    });

    if (!registry) {
      return NextResponse.json({ posts: [] });
    }

    // Try to get posts from client_posts table (if it exists)
    // For now, return empty array since table may not exist yet
    try {
      const posts = (await prisma.$queryRaw`
        SELECT 
          cp.id,
          cp.type,
          cp.content,
          cp.images,
          cp.contractor_id,
          cp.rating,
          cp.like_count,
          cp.comment_count,
          cp.created_at as "createdAt"
        FROM client_posts cp
        WHERE cp.user_id = ${registry.id}
        ORDER BY cp.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as Record<string, unknown>[];

      // Check if user has liked each post
      const postsWithLikes = await Promise.all(
        posts.map(async (post: any) => {
          const isLiked = await prisma.$queryRaw`
            SELECT 1 FROM post_likes WHERE post_id = ${post.id} AND user_id = ${registry.id}
          `;
          return {
            ...post,
            images: post.images || [],
            isLiked: Array.isArray(isLiked) && isLiked.length > 0,
          };
        })
      );

      return NextResponse.json({ posts: postsWithLikes });
    } catch (error) {
      // Table doesn't exist yet, return empty array
      logger.debug("client_posts table may not exist yet:", error);
      return NextResponse.json({ posts: [] });
    }
  } catch (error) {
    logger.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

// POST /api/portal/posts - Create a new post
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type = "update", content, images = [], contractorId, rating } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Get user from user_registry (works for both client & pro users)
    const registry = await prisma.user_registry.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, orgId: true },
    });

    if (!registry) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Try to insert into client_posts table
    try {
      const newPost = (await prisma.$queryRaw`
        INSERT INTO client_posts (user_id, organization_id, type, content, images, contractor_id, rating)
        VALUES (${registry.id}, ${registry.orgId}, ${type}, ${content}, ${JSON.stringify(images)}::jsonb, ${contractorId || null}, ${rating || null})
        RETURNING 
          id,
          type,
          content,
          images,
          contractor_id as "contractorId",
          rating,
          like_count as "likeCount",
          comment_count as "commentCount",
          created_at as "createdAt"
      `) as Record<string, unknown>[];

      return NextResponse.json({ post: newPost[0] });
    } catch (error) {
      logger.error("Error creating post (table may not exist):", error);
      // Return a mock post for now
      return NextResponse.json({
        post: {
          id: `temp-${Date.now()}`,
          type,
          content,
          images,
          contractorId,
          rating,
          likeCount: 0,
          commentCount: 0,
          createdAt: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    logger.error("Error creating post:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
