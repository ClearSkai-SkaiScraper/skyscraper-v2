export const dynamic = "force-dynamic";
/**
 * GET /api/contractors/public/[slug]
 * Public contractor profile by slug path param (client-side fetch)
 * NO AUTHENTICATION REQUIRED
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import prisma from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;

    const company = await prisma.tradesCompany.findUnique({
      where: { slug },
      include: {
        members: {
          where: { isActive: true },
          take: 1,
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!company || !company.isActive) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    const member = company.members[0] || null;

    return NextResponse.json({
      contractor: {
        id: member?.id || company.id,
        slug: company.slug,
        businessName: company.name,
        logoUrl: company.logo,
        coverPhotoUrl: company.coverimage,
        tagline: member?.tagline || null,
        about: member?.aboutCompany || company.description,
        phone: member?.phone || company.phone,
        email: member?.email || company.email,
        website: member?.companyWebsite || company.website,
        services: member?.specialties || company.specialties,
        serviceAreas: company.serviceArea,
        hoursOfOperation: member?.hoursOfOperation || null,
        emergencyAvailable: member?.emergencyAvailable ?? false,
        licenseNumber: member?.companyLicense || company.licenseNumber,
        insuranceVerified: company.insuranceVerified ?? false,
        verified: company.isVerified ?? false,
        rating: company.rating ? Number(company.rating) : null,
        reviewCount: company.reviewCount ?? 0,
        yearsInBusiness: company.yearsInBusiness,
        orgId: member?.orgId || company.orgId,
      },
    });
  } catch (error) {
    logger.error("❌ [GET /api/contractors/public/[slug]] Error:", error);
    return NextResponse.json({ error: "Failed to load contractor profile" }, { status: 500 });
  }
}
