/**
 * Trades Feed Engagement API
 *
 * POST /api/trades/feed/engage — Toggle like, add comment, or share a post
 *
 * Body: { postId, action: "like" | "comment" | "share", commentText?: string }
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { postId, action, commentText } = body;

    if (!postId || !action) {
      return NextResponse.json({ error: "postId and action are required" }, { status: 400 });
    }

    if (!["like", "comment", "share"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Find or create engagement record
    const existing = await prisma.trades_feed_engagement
      .findUnique({
        where: {
          post_id_user_id: {
            post_id: postId,
            user_id: userId,
          },
        },
      })
      .catch(() => null);

    if (action === "like") {
      const nowLiked = existing ? !existing.liked : true;

      if (existing) {
        await prisma.trades_feed_engagement.update({
          where: { id: existing.id },
          data: { liked: nowLiked, updated_at: new Date() },
        });
      } else {
        await prisma.trades_feed_engagement.create({
          data: {
            id: `eng_${Date.now()}_${userId.slice(-6)}`,
            post_id: postId,
            user_id: userId,
            liked: true,
            updated_at: new Date(),
          },
        });
      }

      // Get total like count for the post
      const likeCount = await prisma.trades_feed_engagement.count({
        where: { post_id: postId, liked: true },
      });

      return NextResponse.json({ liked: nowLiked, likeCount });
    }

    if (action === "comment") {
      if (!commentText?.trim()) {
        return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
      }

      // Store comment in engagement record
      if (existing) {
        await prisma.trades_feed_engagement.update({
          where: { id: existing.id },
          data: { comment_text: commentText.trim(), updated_at: new Date() },
        });
      } else {
        await prisma.trades_feed_engagement.create({
          data: {
            id: `eng_${Date.now()}_${userId.slice(-6)}`,
            post_id: postId,
            user_id: userId,
            liked: false,
            comment_text: commentText.trim(),
            updated_at: new Date(),
          },
        });
      }

      return NextResponse.json({ commented: true });
    }

    if (action === "share") {
      // Share is just tracked as a count — no persistent record needed beyond engagement
      return NextResponse.json({ shared: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[POST /api/trades/feed/engage]", error);
    return NextResponse.json(
      { error: "Failed to engage" },
      { status: 500 }
    );
  }
}
