/**
 * Trades Posts API
 *
 * GET    /api/trades/posts — Fetch posts (by companyId or profileId)
 * POST   /api/trades/posts — Create a new post
 * DELETE /api/trades/posts — Delete a post
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const profileId = searchParams.get("profileId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (companyId) {
      where.companyId = companyId;
    } else if (profileId) {
      // profileId could be a company member ID — find their company
      const member = await prisma.tradesCompanyMember.findFirst({
        where: { id: profileId },
        select: { companyId: true, userId: true },
      });
      if (member?.companyId) {
        where.companyId = member.companyId;
      } else if (member?.userId) {
        where.authorId = member.userId;
      } else {
        where.authorId = profileId;
      }
    } else {
      // Default: get posts by the current user's company
      const member = await prisma.tradesCompanyMember.findFirst({
        where: { userId },
        select: { companyId: true },
      });
      if (member?.companyId) {
        where.companyId = member.companyId;
      } else {
        where.authorId = userId;
      }
    }

    const posts = await prisma.tradesPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
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

    const formattedPosts = posts.map((post: any) => ({
      id: post.id,
      authorId: post.authorId,
      companyId: post.companyId,
      title: post.title,
      content: post.content || "",
      images: post.images || [],
      tags: post.tags || [],
      postType: post.postType || "update",
      companyName: post.tradesCompany?.name || null,
      companyLogo: post.tradesCompany?.logo || null,
      isVerified: post.tradesCompany?.isVerified || false,
      createdAt: post.createdAt,
    }));

    return NextResponse.json({ posts: formattedPosts });
  } catch (error) {
    logger.error("[GET /api/trades/posts]", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let companyId: string | null = null;

    // Get the user's company
    const member = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: { companyId: true, companyName: true },
    });
    companyId = member?.companyId || null;

    const body = await req.json();
    const { type, title, content, tags, images } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const post = await prisma.tradesPost.create({
      data: {
        authorId: userId,
        companyId,
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

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    logger.error("[POST /api/trades/posts]", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    // Verify ownership
    const post = await prisma.tradesPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.authorId !== userId) {
      return NextResponse.json({ error: "Not authorized to delete this post" }, { status: 403 });
    }

    await prisma.tradesPost.update({
      where: { id: postId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[DELETE /api/trades/posts]", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
