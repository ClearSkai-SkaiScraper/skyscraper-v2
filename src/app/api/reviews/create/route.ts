/**
 * POST /api/reviews/create — Submit a review for a contractor
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

const reviewSchema = z.object({
  contractorProfileId: z.string(),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(1),
  photos: z.array(z.string()).optional().default([]),
  publicLeadId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { contractorProfileId, rating, content, photos, publicLeadId } = parsed.data;

    // Verify contractor profile exists
    const profile = await prisma.contractor_profiles.findUnique({
      where: { id: contractorProfileId },
      select: { id: true, userId: true, orgId: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Contractor profile not found" }, { status: 404 });
    }

    // Check for duplicate review
    const existing = await prisma.reviews.findFirst({
      where: { contractorProfileId, userId: ctx.userId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already reviewed this contractor" },
        { status: 409 }
      );
    }

    // Create review
    const now = new Date();
    const review = await prisma.reviews.create({
      data: {
        id: crypto.randomUUID(),
        contractorProfileId,
        userId: ctx.userId,
        rating,
        content,
        photos,
        publicLeadId: publicLeadId || null,
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      },
    });

    // Update contractor's average rating
    const allReviews = await prisma.reviews.findMany({
      where: { contractorProfileId, status: "PUBLISHED" },
      select: { rating: true },
    });
    // Include the new one in the calculation
    const allRatings = [...allReviews.map((r) => r.rating), rating];
    const avgRating = allRatings.reduce((s, r) => s + r, 0) / allRatings.length;

    await prisma.contractor_profiles.update({
      where: { id: contractorProfileId },
      data: {
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: allRatings.length,
      },
    });

    // Roll up to company: if contractor belongs to a tradesCompany, update company stats too
    if (profile.orgId) {
      try {
        const company = await prisma.tradesCompany.findFirst({
          where: { orgId: profile.orgId },
          select: { id: true },
        });
        if (company) {
          // Count all reviews for all members of this company
          const companyMembers = await prisma.tradesCompanyMember.findMany({
            where: { companyId: company.id, isActive: true },
            select: { id: true },
          });
          const memberIds = companyMembers.map((m) => m.id);
          const companyReviews = await prisma.trade_reviews.findMany({
            where: { contractorId: { in: memberIds }, status: "published" },
            select: { rating: true },
          });
          // Also count reviews model
          const profileReviews = await prisma.reviews.findMany({
            where: {
              contractorProfileId: { in: memberIds.map(String) },
              status: "PUBLISHED",
            },
            select: { rating: true },
          });
          const allCompanyRatings = [
            ...companyReviews.map((r) => r.rating),
            ...profileReviews.map((r) => r.rating),
          ];
          if (allCompanyRatings.length > 0) {
            const companyAvg =
              allCompanyRatings.reduce((s, r) => s + r, 0) / allCompanyRatings.length;
            await prisma.tradesCompany.update({
              where: { id: company.id },
              data: {
                rating: Math.round(companyAvg * 10) / 10,
                reviewCount: allCompanyRatings.length,
              },
            });
          }
        }
      } catch (rollupErr) {
        logger.warn("[REVIEWS_CREATE] Company rollup failed:", rollupErr);
      }
    }

    logger.info("[REVIEWS_CREATE]", { userId: ctx.userId, contractorProfileId, rating });

    return NextResponse.json(
      { success: true, review: { id: review.id, rating, status: review.status } },
      { status: 201 }
    );
  } catch (error) {
    logger.error("[REVIEWS_CREATE]", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
