/**
 * GET /api/reviews/[contractorId] — Get reviews for a contractor profile
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { contractorId: string } }) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { contractorId } = await params;
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1") || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "10") || 10)
    );
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.reviews.findMany({
        where: {
          contractorProfileId: contractorId,
          status: "PUBLISHED",
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.reviews.count({
        where: {
          contractorProfileId: contractorId,
          status: "PUBLISHED",
        },
      }),
    ]);

    // Rating distribution
    const allReviews = await prisma.reviews.findMany({
      where: { contractorProfileId: contractorId, status: "PUBLISHED" },
      select: { rating: true },
    });

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of allReviews) {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    }

    const avgRating =
      allReviews.length > 0 ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length : 0;

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        content: r.content,
        photos: r.photos,
        response: r.response,
        respondedAt: r.respondedAt?.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      avgRating: Math.round(avgRating * 10) / 10,
      distribution,
    });
  } catch (error) {
    logger.error("[REVIEWS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}
