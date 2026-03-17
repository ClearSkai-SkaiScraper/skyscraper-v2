// ORG-SCOPE: Public marketplace — searches tradesCompanyMember/tradesProfile. Cross-org by design (pro discovery).
/**
 * Find Pro API - Client Portal
 * Searches for contractors with filtering and sorting
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const proId = searchParams.get("proId");
    const trade = searchParams.get("trade");
    const search = searchParams.get("search");
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";
    const minRating = parseFloat(searchParams.get("minRating") || "0");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // If fetching a specific pro by ID
    if (proId) {
      // First try to find as TradesCompanyMember (must be active & onboarding complete)
      let pro = await prisma.tradesCompanyMember.findFirst({
        where: { id: proId, isActive: true, onboardingStep: "complete" },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          companyName: true,
          tradeType: true,
          avatar: true,
          profilePhoto: true,
          coverPhoto: true,
          tagline: true,
          bio: true,
          aboutCompany: true,
          city: true,
          state: true,
          phone: true,
          email: true,
          companyWebsite: true,
          companyLicense: true,
          yearsExperience: true,
          foundedYear: true,
          company: {
            select: {
              id: true,
              coverimage: true,
              logo: true,
            },
          },
          teamSize: true,
          rocNumber: true,
          insuranceProvider: true,
          bondAmount: true,
          emergencyAvailable: true,
          freeEstimates: true,
          portfolioImages: true,
          certifications: true,
          specialties: true,
          reviews: {
            select: {
              rating: true,
            },
          },
        },
      });

      // If not found by member ID, try to find by company ID and get first member
      if (!pro) {
        // First check if proId is a valid UUID format for company lookup
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          proId
        );

        if (isValidUuid) {
          const company = await prisma.tradesCompany.findUnique({
            where: { id: proId },
            include: {
              members: {
                take: 1,
                select: {
                  id: true,
                  userId: true,
                  firstName: true,
                  lastName: true,
                  companyName: true,
                  tradeType: true,
                  avatar: true,
                  profilePhoto: true,
                  coverPhoto: true,
                  tagline: true,
                  bio: true,
                  aboutCompany: true,
                  city: true,
                  state: true,
                  phone: true,
                  email: true,
                  companyWebsite: true,
                  companyLicense: true,
                  yearsExperience: true,
                  foundedYear: true,
                  teamSize: true,
                  rocNumber: true,
                  insuranceProvider: true,
                  bondAmount: true,
                  emergencyAvailable: true,
                  freeEstimates: true,
                  portfolioImages: true,
                  certifications: true,
                  specialties: true,
                  reviews: {
                    select: {
                      rating: true,
                    },
                  },
                },
              },
            },
          });

          if (company && company.members.length > 0) {
            const member = company.members[0];
            pro = {
              ...member,
              company: {
                id: company.id,
                coverimage: company.coverimage,
                logo: company.logo,
              },
            };
          } else if (company) {
            // Company exists but no members - return company info
            return NextResponse.json({
              pros: [
                {
                  id: company.id,
                  companyId: company.id,
                  name: company.name || "Pro",
                  companyName: company.name,
                  tradeType: (company.specialties as string[])?.[0] || "General Contractor",
                  avatar: company.logo,
                  coverPhoto: company.coverimage,
                  tagline: null,
                  bio: company.description,
                  city: company.city,
                  state: company.state,
                  phone: company.phone,
                  email: company.email,
                  website: company.website,
                  yearsExperience: null,
                  foundedYear: null,
                  teamSize: null,
                  isVerified: company.isVerified || false,
                  isLicensed: !!company.licenseNumber,
                  isBonded: false,
                  isInsured: false,
                  rocNumber: company.licenseNumber,
                  emergencyAvailable: false,
                  freeEstimates: true,
                  portfolioImages: [],
                  certifications: [],
                  specialties: (company.specialties as string[]) || [],
                  rating: company.rating ? parseFloat(company.rating.toString()) : 5.0,
                  reviewCount: company.reviewCount || 0,
                },
              ],
              total: 1,
            });
          }
        }

        // Last resort - try to find member by Clerk userId
        if (!pro) {
          const memberByUserId = await prisma.tradesCompanyMember.findFirst({
            where: { userId: proId },
            select: {
              id: true,
              userId: true,
              firstName: true,
              lastName: true,
              companyName: true,
              tradeType: true,
              avatar: true,
              profilePhoto: true,
              coverPhoto: true,
              tagline: true,
              bio: true,
              aboutCompany: true,
              city: true,
              state: true,
              phone: true,
              email: true,
              companyWebsite: true,
              companyLicense: true,
              yearsExperience: true,
              foundedYear: true,
              company: {
                select: {
                  id: true,
                  coverimage: true,
                  logo: true,
                },
              },
              teamSize: true,
              rocNumber: true,
              insuranceProvider: true,
              bondAmount: true,
              emergencyAvailable: true,
              freeEstimates: true,
              portfolioImages: true,
              certifications: true,
              specialties: true,
              reviews: {
                select: {
                  rating: true,
                },
              },
            },
          });

          if (memberByUserId) {
            pro = memberByUserId;
          }
        }
      }

      if (!pro) {
        logger.info(
          `[find-pro] Pro not found for ID: ${proId}. Checked: tradesCompanyMember, tradesCompany, userId lookup`
        );
        // Return error with details
        return NextResponse.json({
          pros: [],
          total: 0,
          error: "Profile not found",
          searchedId: proId,
          message: "This profile may have been removed or the ID is invalid.",
        });
      }

      // Ensure we have a companyId - create company if needed
      let companyId = pro.company?.id;
      if (!companyId) {
        // Member doesn't have a company - find existing or create one
        // IMPORTANT: Check multiple sources to avoid creating duplicates like "Damien's Company"
        // when "ClearSkai Technologies" already exists for this user
        const memberCompanyName =
          pro.companyName ||
          [pro.firstName, pro.lastName].filter(Boolean).join(" ") ||
          `Pro-${pro.id.slice(-8)}`;

        // First: check if any OTHER member with same userId already has a company
        let company = pro.userId
          ? await prisma.tradesCompanyMember
              .findFirst({
                where: { userId: pro.userId, companyId: { not: null } },
                select: { company: true },
              })
              .then((m) => m?.company || null)
              .catch(() => null)
          : null;

        // Second: search by company name (case-insensitive)
        if (!company) {
          company = await prisma.tradesCompany.findFirst({
            where: {
              name: { equals: memberCompanyName, mode: "insensitive" },
            },
          });
        }

        if (!company) {
          company = await prisma.tradesCompany.create({
            data: {
              name: memberCompanyName,
              slug: `company-${pro.id.slice(-8)}`,
              isActive: true,
            },
          });
        }

        // Link member to company
        await prisma.tradesCompanyMember.update({
          where: { id: pro.id },
          data: { companyId: company.id },
        });

        companyId = company.id;
      }

      const reviews = (pro.reviews as Array<{ rating: number }>) || [];
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const rating = reviews.length > 0 ? totalRating / reviews.length : 5.0;

      const hasLicense = !!(pro.companyLicense || pro.rocNumber);
      const hasInsurance = !!pro.insuranceProvider;
      const hasBond = !!pro.bondAmount;

      const personName = [pro.firstName, pro.lastName].filter(Boolean).join(" ");

      return NextResponse.json({
        pros: [
          {
            id: pro.id,
            companyId: companyId,
            name: personName || pro.companyName || "Pro",
            companyName: pro.companyName,
            tradeType: pro.tradeType || "General Contractor",
            avatar: pro.profilePhoto || pro.avatar || pro.company?.logo,
            coverPhoto: pro.coverPhoto || pro.company?.coverimage,
            tagline: pro.tagline,
            bio: pro.bio || pro.aboutCompany,
            city: pro.city,
            state: pro.state,
            phone: pro.phone,
            email: pro.email,
            website: pro.companyWebsite,
            yearsExperience: pro.yearsExperience,
            foundedYear: pro.foundedYear,
            teamSize: pro.teamSize,
            isVerified: hasLicense && hasInsurance,
            isLicensed: hasLicense,
            isBonded: hasBond,
            isInsured: hasInsurance,
            rocNumber: pro.rocNumber,
            emergencyAvailable: pro.emergencyAvailable || false,
            freeEstimates: pro.freeEstimates ?? true,
            portfolioImages: (pro.portfolioImages as string[]) || [],
            certifications: (pro.certifications as string[]) || [],
            specialties: (pro.specialties as string[]) || [],
            rating,
            reviewCount: reviews.length,
          },
        ],
        total: 1,
      });
    }

    // Build where clause - show contractors (strict filter for profile quality)
    const where: Record<string, unknown> = {};

    // Base visibility: MUST have completed onboarding AND be active
    // This ensures incomplete/draft profiles are NEVER shown to clients
    const baseFilter = {
      isActive: true,
      status: "active",
      onboardingStep: "complete", // Only show profiles that have been saved/completed
    };

    // Filter by trade
    if (trade && trade !== "All Trades") {
      where.tradeType = trade;
    }

    // Search by name or company name — combine with active filter using AND
    if (search) {
      where.AND = [
        baseFilter,
        {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { companyName: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    } else {
      Object.assign(where, baseFilter);
    }

    // Fetch contractors from TradesCompanyMember
    const pros = await prisma.tradesCompanyMember.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        tradeType: true,
        title: true, // Job title
        jobTitle: true, // Alternative job title field
        avatar: true,
        profilePhoto: true,
        coverPhoto: true,
        tagline: true,
        bio: true,
        aboutCompany: true,
        city: true,
        state: true,
        phone: true,
        companyWebsite: true,
        companyLicense: true,
        yearsExperience: true,
        foundedYear: true,
        // Include company data for cover photo fallback and linking
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            coverimage: true,
            logo: true,
          },
        },
        teamSize: true,
        rocNumber: true,
        insuranceProvider: true,
        bondAmount: true,
        emergencyAvailable: true,
        freeEstimates: true,
        portfolioImages: true,
        certifications: true,
        specialties: true,
        // Include average rating from reviews
        reviews: {
          select: {
            rating: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
    });

    // Calculate ratings and format response
    const formattedPros = pros
      .map((pro) => {
        const reviews = (pro.reviews as Array<{ rating: number }>) || [];
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const rating = reviews.length > 0 ? totalRating / reviews.length : 5.0;
        const reviewCount = reviews.length;

        // Derive verification status from available data
        const hasLicense = !!(pro.companyLicense || pro.rocNumber);
        const hasInsurance = !!pro.insuranceProvider;
        const hasBond = !!pro.bondAmount;
        const isVerified = hasLicense && hasInsurance;

        // Build display name - show person name as primary, company as secondary
        const personName = [pro.firstName, pro.lastName].filter(Boolean).join(" ");
        const displayName = personName || pro.companyName || "Pro";

        return {
          id: pro.id,
          companyId: pro.company?.id,
          slug: pro.company?.slug || null,
          name: displayName,
          companyName: pro.company?.name || pro.companyName,
          tradeType: pro.tradeType || "General Contractor",
          title: pro.title || pro.jobTitle || null, // Job title
          avatar: pro.profilePhoto || pro.avatar || pro.company?.logo,
          coverPhoto: pro.coverPhoto || pro.company?.coverimage,
          tagline: pro.tagline,
          bio: pro.bio || pro.aboutCompany,
          city: pro.city,
          state: pro.state,
          phone: pro.phone,
          website: pro.companyWebsite,
          yearsExperience: pro.yearsExperience,
          foundedYear: pro.foundedYear,
          teamSize: pro.teamSize,
          isVerified,
          isLicensed: hasLicense,
          isBonded: hasBond,
          isInsured: hasInsurance,
          rocNumber: pro.rocNumber,
          emergencyAvailable: pro.emergencyAvailable || false,
          freeEstimates: pro.freeEstimates ?? true,
          portfolioImages: (pro.portfolioImages as string[]) || [],
          certifications: (pro.certifications as string[]) || [],
          specialties: (pro.specialties as string[]) || [],
          rating,
          reviewCount,
          engagementScore: 0,
        };
      })
      .filter((pro) => {
        // Filter by verified only
        if (verifiedOnly && !pro.isVerified) {
          return false;
        }
        // Filter by minimum rating
        if (minRating > 0 && pro.rating < minRating) {
          return false;
        }
        return true;
      });

    // Deduplicate by companyId (or id fallback). Prefer richer profiles.
    const dedupedPros = Array.from(
      formattedPros
        .reduce((map, pro) => {
          const key = pro.companyId || pro.companyName || pro.id;
          const score =
            (pro.avatar ? 1 : 0) +
            (pro.coverPhoto ? 1 : 0) +
            (pro.bio ? 1 : 0) +
            (pro.tagline ? 1 : 0) +
            (pro.specialties?.length ? 1 : 0) +
            (pro.yearsExperience ? 1 : 0) +
            (pro.companyName ? 1 : 0);

          const existing = map.get(key);
          if (!existing || score > existing.score) {
            map.set(key, { pro, score });
          }
          return map;
        }, new Map<string, { pro: (typeof formattedPros)[number]; score: number }>())
        .values()
    ).map((entry) => entry.pro);

    // ── Fallback: also include tradesCompany records not already represented ──
    // This catches companies whose members haven't completed onboarding yet
    // (e.g., the pro admin created a company but skipped the trades onboarding wizard)
    try {
      const existingCompanyIds = new Set(dedupedPros.map((p) => p.companyId).filter(Boolean));

      const companyWhere: Record<string, unknown> = { isActive: true };
      if (search) {
        companyWhere.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { city: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      const fallbackCompanies = await prisma.tradesCompany.findMany({
        where: companyWhere,
        take: 10,
        orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          state: true,
          phone: true,
          email: true,
          website: true,
          description: true,
          logo: true,
          coverimage: true,
          specialties: true,
          licenseNumber: true,
          rating: true,
          reviewCount: true,
          isVerified: true,
        },
      });

      for (const company of fallbackCompanies) {
        if (!existingCompanyIds.has(company.id)) {
          dedupedPros.push({
            id: company.id,
            companyId: company.id,
            slug: company.slug,
            name: company.name || "Pro",
            companyName: company.name,
            tradeType: (company.specialties as string[])?.[0] || "General Contractor",
            title: null,
            avatar: company.logo,
            coverPhoto: company.coverimage,
            tagline: null,
            bio: company.description,
            city: company.city,
            state: company.state,
            phone: company.phone,
            website: company.website,
            yearsExperience: null,
            foundedYear: null,
            teamSize: null,
            isVerified: company.isVerified || !!company.licenseNumber,
            isLicensed: !!company.licenseNumber,
            isBonded: false,
            isInsured: false,
            rocNumber: company.licenseNumber,
            emergencyAvailable: false,
            freeEstimates: true,
            portfolioImages: [],
            certifications: [],
            specialties: (company.specialties as string[]) || [],
            rating: company.rating ? parseFloat(company.rating.toString()) : 5.0,
            reviewCount: company.reviewCount || 0,
            engagementScore: 0,
          });
        }
      }
    } catch (companyErr) {
      logger.warn("[find-pro] Fallback company search failed:", companyErr);
    }

    return NextResponse.json({
      pros: dedupedPros,
      total: dedupedPros.length,
      hasMore: pros.length === limit,
    });
  } catch (error) {
    logger.error("Find pro error:", error);
    return NextResponse.json({ error: "Failed to search for contractors" }, { status: 500 });
  }
}
