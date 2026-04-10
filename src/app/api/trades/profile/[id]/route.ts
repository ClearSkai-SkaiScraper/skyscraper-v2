/**
 * API Route: GET /api/trades/profile/[id]
 * Get a Pro's public profile with connection status and review status
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();

    const contractorId = params.id;

    // Get the Contractor Profile (tradesCompanyMember IS the profile)
    const contractor = await prisma.tradesCompanyMember.findFirst({
      where: { id: contractorId },
      include: {
        company: true,
        reviews: true,
      },
    });

    if (!contractor) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Calculate average rating from reviews
    const avgRating =
      contractor.reviews.length > 0
        ? contractor.reviews.reduce((sum, r) => sum + r.rating, 0) / contractor.reviews.length
        : 0;

    // If user is authenticated, check connection status and review status
    let alreadyConnected = false;
    let hasReviewed = false;

    if (userId) {
      // Find client by userId (Clerk user ID stored in userId field)
      const client = await prisma.client.findFirst({
        where: { userId: userId },
      });

      if (client) {
        // Check if this client has an existing connection with this contractor
        const connection = await prisma.clientProConnection.findFirst({
          where: {
            clientId: client.id,
            contractorId: contractorId,
          },
        });

        const s = connection?.status?.toLowerCase();
        alreadyConnected = s === "accepted" || s === "pending";

        // Check if client has already reviewed this contractor
        if (s === "accepted") {
          const existingReview = await prisma.trade_reviews.findFirst({
            where: {
              contractorId: contractorId,
              clientId: client.id,
            },
          });
          hasReviewed = !!existingReview;
        }
      }
    }

    // Return profile with connection/review metadata
    return NextResponse.json({
      profile: {
        id: contractor.id,
        companyName: contractor.companyName,
        businessName: contractor.companyName,
        tradeType: contractor.tradeType || "General Contractor",
        specialties: contractor.specialties || [],
        bio: contractor.bio || contractor.tagline,
        baseZip: contractor.zip,
        radiusMiles: 25,
        serviceRadius: 25,
        yearsExperience: contractor.yearsExperience,
        licenseNumber: contractor.companyLicense,
        avgRating: avgRating,
        totalReviews: contractor.reviews.length,
        insuranceVerified: !!contractor.insuranceProvider,
        portfolioImages: contractor.portfolioImages || [],
      },
      alreadyConnected,
      hasReviewed,
    });
  } catch (error) {
    logger.error("[GET_PRO_PROFILE]", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
