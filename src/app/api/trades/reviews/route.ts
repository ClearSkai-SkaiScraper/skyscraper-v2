export const dynamic = "force-dynamic";

// ORG-SCOPE: Scoped by proId/contractorId (GET) and userId→clientId (POST) — no cross-tenant risk
// GET filters reviews by contractorId (proId param). POST requires authenticated user's
// client record + verified connection to the pro. trade_reviews has no orgId;
// reviews are cross-org (clients from any org can review pros from any org).

/**
 * POST /api/trades/reviews
 * Client submits a review for a Pro they've connected with
 *
 * GET /api/trades/reviews?proId=xxx
 * Retrieve reviews for a specific Pro (tradesCompanyMember.id)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const CreateReviewSchema = z.object({
  proId: z.string(), // tradesCompanyMember.id (UUID)
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().min(1),
  jobType: z.string().optional(),
  projectCost: z.string().optional(),
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const data = CreateReviewSchema.parse(body);

    // Find the client record for the current user
    const client = await prisma.client.findFirst({
      where: { userId },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client record not found. Please complete your profile first." },
        { status: 400 }
      );
    }

    // Get the contractor member and their company
    const contractor = await prisma.tradesCompanyMember.findFirst({
      where: { id: data.proId },
      select: { id: true, companyId: true, tradeType: true },
    });

    if (!contractor) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    // Verify that a connection exists between client and pro
    // contractorId in ClientProConnection references tradesCompany.id, not member.id
    const connectionCompanyId = contractor.companyId;
    const connection = connectionCompanyId
      ? await prisma.clientProConnection.findFirst({
          where: {
            clientId: client.id,
            contractorId: connectionCompanyId,
            status: { in: ["accepted", "ACCEPTED"] },
          },
        })
      : null;

    if (!connection) {
      return NextResponse.json(
        { error: "You must have an accepted connection with this Pro to leave a review" },
        { status: 403 }
      );
    }

    // Check for existing review to prevent duplicates
    const existingReview = await prisma.trade_reviews.findFirst({
      where: {
        clientId: client.id,
        contractorId: data.proId,
      },
    });

    if (existingReview) {
      return NextResponse.json({ error: "You have already reviewed this Pro" }, { status: 409 });
    }

    // Create the review
    const review = await prisma.trade_reviews.create({
      data: {
        id: crypto.randomUUID(),
        clientId: client.id,
        contractorId: data.proId,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        jobType: data.jobType || contractor.tradeType || "General",
        projectCost: data.projectCost,
        verified: !!connection, // Verified if they have a connection
      },
    });

    // Note: Rating stats are auto-updated via database trigger

    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        createdAt: review.createdAt,
      },
    });
  } catch (error: unknown) {
    logger.error("[CREATE_REVIEW]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const proId = searchParams.get("proId"); // tradesCompanyMember.id

    if (!proId) {
      return NextResponse.json({ error: "proId query parameter required" }, { status: 400 });
    }

    // Fetch all published reviews for this contractor
    const reviews = await prisma.trade_reviews.findMany({
      where: {
        contractorId: proId,
        status: "published",
      },
      orderBy: { createdAt: "desc" },
      include: {
        Client: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Calculate aggregate stats
    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;

    // Rating distribution
    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        jobType: r.jobType,
        projectCost: r.projectCost,
        verified: r.verified,
        helpful: r.helpful,
        proResponse: r.proResponse,
        respondedAt: r.respondedAt,
        createdAt: r.createdAt.toISOString(),
        clientName:
          r.Client.name ||
          `${r.Client.firstName || ""} ${r.Client.lastName || ""}`.trim() ||
          "Anonymous",
        clientAvatar: r.Client.avatarUrl,
      })),
      stats: {
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews,
        ratingDistribution,
      },
    });
  } catch (error: unknown) {
    logger.error("[GET_REVIEWS]", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}
