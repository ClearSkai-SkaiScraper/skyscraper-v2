export const dynamic = "force-dynamic";
/**
 * PHASE 21 — PUBLIC CONTRACTOR PROFILE API
 * GET /api/public/contractor/[slug] — Get public contractor profile by slug
 *
 * NO AUTHENTICATION REQUIRED - Public endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { getDelegate } from "@/lib/db/modelAliases";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;

    // Slug is on tradesCompany, not tradesCompanyMember
    // Query company by slug and get first member
    const company = await prisma.tradesCompany.findUnique({
      where: { slug },
      include: {
        members: {
          take: 1,
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!company || company.members.length === 0) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    const member = company.members[0];

    // Only return active profiles (isActive on company)
    if (!company.isActive) {
      return NextResponse.json({ error: "Contractor profile is private" }, { status: 404 });
    }

    // Get contractor's public forms
    const forms = await getDelegate("contractorForm").findMany({
      where: {
        contractorId: member.id,
        isPublic: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        fields: true,
        requirePhotos: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Track the view (optional analytics)
    try {
      const sessionId = req.headers.get("x-session-id");
      const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

      if (sessionId) {
        await prisma.public_users.upsert({
          where: { sessionId },
          create: {
            id: crypto.randomUUID(),
            sessionId,
            ipAddress: ipAddress || undefined,
            viewed: [{ contractorId: member.id, slug, timestamp: new Date() }],
          },
          update: {
            lastSeenAt: new Date(),
          },
        });
      }
    } catch (analyticsError) {
      logger.warn("Analytics tracking failed:", analyticsError);
    }

    return NextResponse.json({
      contractor: {
        id: member.id,
        slug: company.slug,
        businessName: company.name,
        logoUrl: company.logo,
        coverPhotoUrl: company.coverimage,
        tagline: member.tagline,
        about: member.aboutCompany || company.description,
        phone: member.phone || company.phone,
        email: member.email || company.email,
        website: member.companyWebsite || company.website,
        services: member.specialties,
        serviceAreas: company.serviceArea,
        hoursOfOperation: member.hoursOfOperation,
        emergencyAvailable: member.emergencyAvailable,
        licenseNumber: member.companyLicense || company.licenseNumber,
        insuranceVerified: company.insuranceVerified,
        certifications: member.certifications,
        gallery: member.portfolioImages,
        verified: company.isVerified,
        rating: company.rating,
        reviewCount: company.reviewCount,
        yearsInBusiness: company.yearsInBusiness,
        orgId: member.orgId,
      },
      forms,
    });
  } catch (error) {
    logger.error("❌ [GET /api/public/contractor/[slug]] Error:", error);
    return NextResponse.json({ error: "Failed to load contractor profile" }, { status: 500 });
  }
}
