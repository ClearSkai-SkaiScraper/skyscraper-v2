/**
 * Trades Feed API
 *
 * GET  /api/trades/feed — Fetch feed posts for the authenticated user
 * POST /api/trades/feed — Create a new feed post
 *
 * Sprint 21: Removed PascalCase TradesPost model from schema so the accessor
 * now cleanly resolves to the camelCase tradesPost model.
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
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

    const posts = await prisma.tradesPost.findMany({
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postIds = posts.map((p: any) => p.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engagementMap = new Map(engagements.map((e: any) => [e.post_id, e]));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  } catch (error: unknown) {
    logger.error("[GET /api/trades/feed]", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const { content, type, title, images, tags, postAs } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Ensure title is never empty (Prisma requires it)
    const safeTitle = (title || content.trim().slice(0, 100) || "Post").trim();

    // Get the user's company membership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let member: any = null;
    try {
      member = await prisma.tradesCompanyMember.findFirst({
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
      });
    } catch {
      // tradesCompanyMember table may not exist — continue without
    }

    // Auto-create trades member if none exists (first-time poster)
    if (!member) {
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

    // Create the post — use try-catch for actionable error messages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let post: any;
    try {
      post = await prisma.tradesPost.create({
        data: {
          authorId: userId,
          companyId: companyId,
          title: safeTitle,
          content: content.trim(),
          images: images || [],
          tags: tags || [],
          postType: type || "update",
          isActive: true,
        },
      });
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : "Unknown database error";
      logger.error("[POST /api/trades/feed] DB create failed:", msg);

      // Surface actionable info based on Prisma error codes
      if (msg.includes("does not exist") || msg.includes("P2021")) {
        return NextResponse.json(
          { error: "Trades database table has not been provisioned yet. Run migrations first." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: `Failed to create post: ${msg.slice(0, 200)}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      post: {
        id: post.id,
        authorId: post.authorId,
        authorName: post.tradesCompany?.name || authorDisplayName,
        authorLogo: post.tradesCompany?.logo || member?.company?.logo || null,
        authorVerified: post.tradesCompany?.isVerified || member?.company?.isVerified || false,
        postAs: useCompanyIdentity ? "company" : "personal",
        content: post.content || content.trim(),
        title: post.title || safeTitle,
        imageUrl: post.images?.[0] || null,
        images: post.images || [],
        tags: post.tags || [],
        postType: post.postType || "update",
        likes: 0,
        comments: 0,
        shares: 0,
        hasLiked: false,
        createdAt: post.createdAt,
      },
    });
  } catch (error: unknown) {
    logger.error("[POST /api/trades/feed]", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
});
