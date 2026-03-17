export const dynamic = "force-dynamic";
/**
 * GET /api/contractors/public/get?slug=xxx
 * Public contractor profile lookup by slug (server-side fetch from /c/[slug] page)
 * NO AUTHENTICATION REQUIRED
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 });
    }

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
        searchKeywords: company.specialties,
        serviceAreas: company.serviceArea,
        hoursOfOperation: member?.hoursOfOperation || null,
        emergencyAvailable: member?.emergencyAvailable ?? false,
        emergencyReady: member?.emergencyAvailable ?? false,
        licenseNumber: member?.companyLicense || company.licenseNumber,
        licenseVerified: !!company.licenseNumber,
        insuranceVerified: company.insuranceVerified ?? false,
        businessVerified: company.isVerified ?? false,
        emailVerified: !!company.email,
        certifications: member?.certifications || [],
        gallery: member?.portfolioImages || [],
        verified: company.isVerified ?? false,
        featured: false,
        featuredUntil: null,
        rating: company.rating ? Number(company.rating) : null,
        reviewCount: company.reviewCount ?? 0,
        yearsInBusiness: company.yearsInBusiness,
        trustScore: calculateTrustScore(company, member),
        totalJobs: 0,
        orgId: member?.orgId || company.orgId,
      },
    });
  } catch (error) {
    logger.error("❌ [GET /api/contractors/public/get] Error:", error);
    return NextResponse.json({ error: "Failed to load contractor profile" }, { status: 500 });
  }
}

function calculateTrustScore(
  company: Record<string, unknown>,
  member: Record<string, unknown> | null
): number {
  let score = 0;
  if (company.isVerified) score += 25;
  if (company.insuranceVerified) score += 20;
  if (company.licenseNumber) score += 15;
  if (company.rating && Number(company.rating) >= 4.0) score += 15;
  if (company.reviewCount && Number(company.reviewCount) >= 5) score += 10;
  if (
    member?.certifications &&
    Array.isArray(member.certifications) &&
    member.certifications.length > 0
  )
    score += 10;
  if (company.yearsInBusiness && Number(company.yearsInBusiness) >= 3) score += 5;
  return score;
}
