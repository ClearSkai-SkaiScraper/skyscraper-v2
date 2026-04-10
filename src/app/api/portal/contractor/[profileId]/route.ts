import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/portal/contractor/[profileId]
 * Get contractor profile for client portal view
 * Allows clients to view their connected contractor's full profile
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { profileId } = await params;

    // Get contractor company profile
    const company = await prisma.tradesCompany.findFirst({
      where: {
        OR: [{ id: profileId }, { slug: profileId }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        coverimage: true,
        description: true,
        specialties: true,
        phone: true,
        email: true,
        website: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        licenseNumber: true,
        insuranceVerified: true,
        yearsInBusiness: true,
        serviceArea: true,
        isVerified: true,
        rating: true,
        reviewCount: true,
        createdAt: true,
        // Include team members
        members: {
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            title: true,
            role: true,
          },
          take: 10,
        },
        // Include portfolio/posts
        tradesPost: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            title: true,
            images: true,
            tags: true,
            createdAt: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    // Check if client is connected to this contractor
    const connection = await prisma.tradesConnection.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: company.id },
          { requesterId: company.id, addresseeId: userId },
        ],
      },
    });

    // Build response - map members to expected format
    const teamMembers = company.members.map((m) => ({
      id: m.id,
      displayName: [m.firstName, m.lastName].filter(Boolean).join(" ") || "Team Member",
      avatarUrl: m.avatar,
      title: m.title,
      role: m.role,
    }));

    // Map posts to expected format
    const portfolio = company.tradesPost.map((p) => ({
      id: p.id,
      title: p.title,
      imageUrl: p.images?.[0] || null,
      category: p.tags?.[0] || null,
      createdAt: p.createdAt,
    }));

    const profile = {
      id: company.id,
      name: company.name,
      slug: company.slug,
      logo: company.logo,
      coverPhoto: company.coverimage,
      description: company.description,
      specialty: company.specialties?.[0] || null,
      contact: {
        phone: company.phone,
        email: company.email,
        website: company.website,
      },
      location: {
        address: company.address,
        city: company.city,
        state: company.state,
        zip: company.zip,
        serviceRadius: company.serviceArea?.[0] || null,
      },
      credentials: {
        licenseNumber: company.licenseNumber,
        insuranceVerified: company.insuranceVerified,
        isVerified: company.isVerified,
      },
      stats: {
        yearsInBusiness: company.yearsInBusiness,
        rating: company.rating,
        reviewCount: company.reviewCount,
      },
      team: teamMembers,
      reviews: [], // Reviews are on tradesCompanyMember, not tradesCompany
      portfolio: portfolio,
      isConnected: !!connection,
      createdAt: company.createdAt,
    };

    return NextResponse.json({ profile });
  } catch (error) {
    logger.error("[GET /api/portal/contractor/[profileId]] Error:", error);
    return NextResponse.json({ error: "Failed to fetch contractor" }, { status: 500 });
  }
}
