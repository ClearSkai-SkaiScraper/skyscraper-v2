// ORG-SCOPE: Public company profile — queries tradesCompany by slug/id. Cross-org by design (public directory).
/**
 * Public Company API
 * GET /api/portal/company/[slug] — Company profile with team members
 * Returns company info and active team members for client portal viewing.
 * NOTE: This is a public route — PII (email, phone) is only returned for authenticated + connected clients.
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    // Try by slug first, then by UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    const company = await prisma.tradesCompany.findFirst({
      where: isUUID ? { id: slug } : { slug },
      include: {
        members: {
          where: { isActive: true },
          orderBy: [{ isOwner: "desc" }, { isAdmin: "desc" }, { createdAt: "asc" }],
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            title: true,
            tradeType: true,
            bio: true,
            avatar: true,
            profilePhoto: true,
            isOwner: true,
            isAdmin: true,
            role: true,
            specialties: true,
            certifications: true,
            yearsExperience: true,
            phone: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check if the caller is authenticated and connected to this company
    let isConnectedClient = false;
    try {
      // eslint-disable-next-line @typescript-eslint/await-thenable
      const { userId } = await auth();
      if (userId) {
        const client = await prisma.client.findFirst({
          where: { userId },
          select: { id: true },
        });
        if (client) {
          const connection = await prisma.clientProConnection.findFirst({
            where: {
              clientId: client.id,
              contractorId: company.id,
              status: { in: ["connected", "accepted"] },
            },
          });
          isConnectedClient = !!connection;
        }
      }
    } catch {
      // Auth check failed — treat as unauthenticated (no PII)
    }

    // Calculate company average rating from member reviews
    let avgRating = 0;
    let totalReviews = 0;
    try {
      const memberIds = company.members.map((m) => m.id);
      if (memberIds.length > 0) {
        const reviews = await prisma.trade_reviews.findMany({
          where: { contractorId: { in: memberIds } },
        });
        totalReviews = reviews.length;
        avgRating =
          reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
      }
    } catch {
      // Reviews table may not exist
    }

    // Build team members — PII (email, phone) only for connected clients
    const employees = company.members.map((m) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      name: [m.firstName, m.lastName].filter(Boolean).join(" ") || "Team Member",
      avatar: m.profilePhoto || m.avatar || null,
      jobTitle:
        m.jobTitle || m.title || (m.isOwner ? "Owner" : m.isAdmin ? "Admin" : "Team Member"),
      tradeType: m.tradeType || null,
      bio: m.bio || null,
      isOwner: m.isOwner || false,
      isAdmin: m.isAdmin || false,
      role: m.isOwner ? "owner" : m.isAdmin ? "admin" : m.role || "member",
      specialties: m.specialties || [],
      certifications: m.certifications || [],
      yearsExperience: m.yearsExperience || null,
      city: m.city || null,
      state: m.state || null,
      // PII: only for connected clients
      email: isConnectedClient ? m.email : undefined,
      phone: isConnectedClient ? m.phone : undefined,
    }));

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        description: company.description,
        logo: company.logo,
        coverImage: company.coverimage,
        email: isConnectedClient ? company.email : undefined,
        phone: isConnectedClient ? company.phone : undefined,
        website: company.website, // website is public by nature
        address: company.address,
        city: company.city,
        state: company.state,
        zip: company.zip,
        specialties: company.specialties || [],
        serviceArea: company.serviceArea || [],
        yearsInBusiness: company.yearsInBusiness,
        licenseNumber: company.licenseNumber,
        insuranceVerified: company.insuranceVerified || false,
        isVerified: company.isVerified || false,
        rating: avgRating
          ? Math.round(avgRating * 10) / 10
          : company.rating
            ? parseFloat(String(company.rating))
            : 0,
        reviewCount: totalReviews || company.reviewCount || 0,
      },
      employees,
      employeeCount: employees.length,
    });
  } catch (error) {
    logger.error("[portal/company] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
