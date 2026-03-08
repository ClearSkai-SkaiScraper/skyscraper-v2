export const dynamic = "force-dynamic";
/**
 * GET /api/contractors/public/list
 * Public contractor directory search with filtering
 * NO AUTHENTICATION REQUIRED
 *
 * Query params: trade, zip, radius, verified, emergency, sort
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const trade = searchParams.get("trade");
    const zip = searchParams.get("zip");
    const verified = searchParams.get("verified") === "true";
    const emergency = searchParams.get("emergency") === "true";
    const sort = searchParams.get("sort") || "best";

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (verified) {
      where.isVerified = true;
    }

    // Fetch companies
    const companies = await prisma.tradesCompany.findMany({
      where: where as never,
      include: {
        members: {
          where: { isActive: true },
          take: 1,
          orderBy: { createdAt: "asc" },
        },
      },
      take: 50,
    });

    // Filter by trade specialty if provided
    let filtered = companies;
    if (trade) {
      const tradeLower = trade.toLowerCase();
      filtered = companies.filter((c) =>
        c.specialties.some((s) => s.toLowerCase().includes(tradeLower))
      );
    }

    // Filter by zip/service area if provided
    if (zip) {
      filtered = filtered.filter(
        (c) => c.zip === zip || c.serviceArea.some((a) => a.includes(zip))
      );
    }

    // Filter by emergency availability
    if (emergency) {
      filtered = filtered.filter((c) => c.members.some((m) => m.emergencyAvailable));
    }

    // Sort
    if (sort === "rating") {
      filtered.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (sort === "reviews") {
      filtered.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    } else {
      // "best" = verified first, then by rating
      filtered.sort((a, b) => {
        if (a.isVerified && !b.isVerified) return -1;
        if (!a.isVerified && b.isVerified) return 1;
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      });
    }

    const contractors = filtered.map((c) => {
      const member = c.members[0] || null;
      return {
        id: c.id,
        slug: c.slug,
        businessName: c.name,
        logoUrl: c.logo,
        coverPhotoUrl: c.coverimage,
        tagline: member?.tagline || null,
        searchKeywords: c.specialties,
        verified: c.isVerified ?? false,
        featured: false,
        featuredUntil: null,
        emergencyAvailable: member?.emergencyAvailable ?? false,
        emergencyReady: member?.emergencyAvailable ?? false,
        serviceAreas: c.serviceArea,
        services: member?.specialties || c.specialties,
        totalJobs: 0,
        distance: null,
        trustScore: calculateTrustScore(c),
        licenseVerified: !!c.licenseNumber,
        insuranceVerified: c.insuranceVerified ?? false,
        businessVerified: c.isVerified ?? false,
        emailVerified: !!c.email,
        rating: c.rating ? Number(c.rating) : null,
        reviewCount: c.reviewCount ?? 0,
      };
    });

    return NextResponse.json({
      contractors,
      origin: zip ? { zip } : null,
      total: contractors.length,
    });
  } catch (error) {
    logger.error("❌ [GET /api/contractors/public/list] Error:", error);
    return NextResponse.json({ error: "Failed to load contractors" }, { status: 500 });
  }
}

function calculateTrustScore(company: Record<string, unknown>): number {
  let score = 0;
  if (company.isVerified) score += 25;
  if (company.insuranceVerified) score += 20;
  if (company.licenseNumber) score += 15;
  if (company.rating && Number(company.rating) >= 4.0) score += 15;
  if (company.reviewCount && Number(company.reviewCount) >= 5) score += 10;
  if (company.yearsInBusiness && Number(company.yearsInBusiness) >= 3) score += 5;
  return Math.min(score, 100);
}
