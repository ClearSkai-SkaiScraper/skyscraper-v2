export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Team Posts API
 * Uses tradesPost model as the unified post store for all feed systems.
 * Team posts are scoped to the user's company via tradesCompanyMember.
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tradesPostModel = prisma.tradesPost as any;

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {

    // Get the user's company to scope team posts
    const member = await prisma.tradesCompanyMember
      .findUnique({
        where: { userId },
        select: { companyId: true },
      })
      .catch(() => null);

    const where: Record<string, unknown> = { isActive: true };
    if (member?.companyId) {
      where.companyId = member.companyId;
    } else {
      // No company — show only own posts
      where.authorId = userId;
    }

    const posts: any[] = await tradesPostModel
      .findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          tradesCompany: {
            select: { id: true, name: true, logo: true, isVerified: true },
          },
        },
      })
      .catch(() => []);

    const formatted = posts.map((p: any) => ({
      id: p.id,
      authorId: p.authorId,
      description: p.content || "",
      pinned: false,
      companyName: p.tradesCompany?.name || null,
      companyLogo: p.tradesCompany?.logo || null,
      createdAt: p.createdAt,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    logger.error("Error fetching team posts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const { message, pinned = false } = await req.json();

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get user's company
    const member = await prisma.tradesCompanyMember
      .findUnique({
        where: { userId },
        select: { companyId: true, companyName: true },
      })
      .catch(() => null);

    const post: any = await tradesPostModel.create({
      data: {
        authorId: userId,
        companyId: member?.companyId || null,
        title: message.trim().slice(0, 100),
        content: message.trim(),
        images: [],
        tags: pinned ? ["pinned"] : [],
        postType: "update",
        isActive: true,
      },
    });

    return NextResponse.json({
      id: post.id,
      authorId: post.authorId,
      description: post.content,
      pinned,
      createdAt: post.createdAt,
    });
  } catch (error) {
    logger.error("Error creating team post:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
