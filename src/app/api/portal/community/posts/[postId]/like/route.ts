import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/portal/community/posts/[postId]/like
 * Toggle like on a community post
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await params;

    // Check if already liked
    const existing = await prisma.community_post_likes.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      // Unlike
      await prisma.community_post_likes.delete({
        where: { id: existing.id },
      });
      await prisma.community_posts.update({
        where: { id: postId },
        data: { likes: { decrement: 1 } },
      });
      return NextResponse.json({ success: true, liked: false });
    }

    // Like
    await prisma.community_post_likes.create({
      data: { postId, userId },
    });
    await prisma.community_posts.update({
      where: { id: postId },
      data: { likes: { increment: 1 } },
    });

    return NextResponse.json({ success: true, liked: true });
  } catch (error) {
    logger.error("[COMMUNITY_LIKE_ERROR]", error);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
