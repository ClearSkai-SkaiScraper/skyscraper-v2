/**
 * API Route: GET /api/trades/profile/[id]/public
 * PUBLIC endpoint — returns a Pro's profile for client portal and public shareable pages.
 * Multi-lookup: member ID → company ID (UUID) → userId fallback
 *
 * Called by:
 *  - portal/profiles/[companyId]/page.tsx (client portal profile view)
 *  - (public)/trades/profile/[id]/page.tsx (public shareable profile)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

const MEMBER_SELECT = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  jobTitle: true,
  title: true,
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
  zip: true,
  phone: true,
  email: true,
  companyWebsite: true,
  companyLicense: true,
  yearsExperience: true,
  foundedYear: true,
  teamSize: true,
  rocNumber: true,
  insuranceProvider: true,
  insuranceExpiration: true,
  bondAmount: true,
  emergencyAvailable: true,
  freeEstimates: true,
  portfolioImages: true,
  certifications: true,
  specialties: true,
  hoursOfOperation: true,
  socialLinks: true,
  paymentMethods: true,
  languages: true,
  warrantyInfo: true,
  workHistory: true,
  lookingFor: true,
  skills: true,
  company: {
    select: {
      id: true,
      name: true,
      slug: true,
      coverimage: true,
      logo: true,
      description: true,
      isVerified: true,
      rating: true,
      reviewCount: true,
    },
  },
  reviews: {
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      clientId: true,
    },
    orderBy: { createdAt: "desc" as const },
    take: 20,
  },
} as const;

function formatProfile(member: any) {
  const reviews = (member.reviews as Array<{ rating: number }>) || [];
  const totalRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0);
  const avgRating = reviews.length > 0 ? totalRating / reviews.length : 5.0;

  const hasLicense = !!(member.companyLicense || member.rocNumber);
  const hasInsurance = !!member.insuranceProvider;
  const hasBond = !!member.bondAmount;
  const personName = [member.firstName, member.lastName].filter(Boolean).join(" ");

  return {
    // Member identity
    id: member.id,
    firstName: member.firstName || null,
    lastName: member.lastName || null,
    jobTitle: member.jobTitle || member.title || null,
    avatar: member.profilePhoto || member.avatar || member.company?.logo || null,

    // Bio & descriptions
    bio: member.bio || member.aboutCompany || null,
    tagline: member.tagline || null,
    aboutCompany: member.aboutCompany || null,
    yearsExperience: member.yearsExperience || null,
    specialties: (member.specialties as string[]) || [],
    skills: (member.skills as string[]) || [],
    certifications: (member.certifications as string[]) || [],
    workHistory: (member.workHistory as any[]) || [],
    lookingFor: (member.lookingFor as string[]) || [],

    // Company / Business
    businessName: member.company?.name || member.companyName || personName || "Pro",
    companyId: member.company?.id || null,
    companySlug: member.company?.slug || null,
    companyLogo: member.company?.logo || null,
    coverPhotoUrl: member.coverPhoto || member.company?.coverimage || null,
    coverPhoto: member.coverPhoto || member.company?.coverimage || null,
    tradeType: member.tradeType || "General Contractor",
    foundedYear: member.foundedYear || null,
    teamSize: member.teamSize || null,

    // Contact
    phone: member.phone || null,
    officePhone: member.phone || null,
    mobilePhone: null,
    email: member.email || null,
    website: member.companyWebsite || null,

    // Location
    city: member.city || null,
    state: member.state || null,
    zip: member.zip || null,
    serviceAreas: member.city && member.state ? [`${member.city}, ${member.state}`] : [],

    // Hours / operations
    hoursOfOperation: member.hoursOfOperation || null,
    emergencyAvailable: member.emergencyAvailable || false,
    freeEstimates: member.freeEstimates ?? true,

    // Licensing / insurance
    rocNumber: member.rocNumber || null,
    rocExpiration: null,
    insuranceProvider: member.insuranceProvider || null,
    insuranceExpiration: member.insuranceExpiration || null,
    bondAmount: member.bondAmount || null,
    isVerified: (hasLicense && hasInsurance) || member.company?.isVerified || false,
    isLicensed: hasLicense,
    isBonded: hasBond,
    isInsured: hasInsurance,

    // Portfolio & social
    portfolioImages: (member.portfolioImages as string[]) || [],
    portfolioUrls: (member.portfolioImages as string[]) || [],
    socialLinks: member.socialLinks || null,
    paymentMethods: (member.paymentMethods as string[]) || [],
    languages: (member.languages as string[]) || [],
    warrantyInfo: member.warrantyInfo || null,

    // Reviews & ratings
    rating: avgRating,
    averageRating: avgRating,
    reviewCount: reviews.length,
    totalReviewsCount: reviews.length,

    // Legacy compatibility
    tradeProfileId: member.id,
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profileId = params.id;
    logger.info("[TRADES_PROFILE_PUBLIC]", { profileId });

    // ── Step 1: Try finding as tradesCompanyMember by ID ──
    let member = await prisma.tradesCompanyMember.findUnique({
      where: { id: profileId },
      select: MEMBER_SELECT,
    });

    // ── Step 2: Try as tradesCompany ID (UUID) — get first member ──
    if (!member) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        profileId
      );

      if (isUuid) {
        const company = await prisma.tradesCompany.findUnique({
          where: { id: profileId },
          include: {
            members: {
              take: 1,
              select: MEMBER_SELECT,
            },
          },
        });

        if (company && company.members.length > 0) {
          member = company.members[0];
        } else if (company) {
          // Company exists but no members — return company-level data
          return NextResponse.json({
            profile: {
              id: company.id,
              firstName: null,
              lastName: null,
              jobTitle: null,
              avatar: company.logo || null,
              bio: company.description || null,
              tagline: null,
              aboutCompany: company.description || null,
              businessName: company.name || "Pro",
              companyId: company.id,
              companySlug: company.slug || null,
              companyLogo: company.logo || null,
              coverPhotoUrl: company.coverimage || null,
              coverPhoto: company.coverimage || null,
              tradeType: "General Contractor",
              yearsExperience: null,
              specialties: [],
              certifications: [],
              portfolioImages: [],
              portfolioUrls: [],
              city: (company as any).city || null,
              state: (company as any).state || null,
              zip: null,
              phone: (company as any).phone || null,
              email: (company as any).email || null,
              website: (company as any).website || null,
              rating: company.rating ? parseFloat(company.rating.toString()) : 5.0,
              averageRating: company.rating ? parseFloat(company.rating.toString()) : 5.0,
              reviewCount: company.reviewCount || 0,
              totalReviewsCount: company.reviewCount || 0,
              isVerified: company.isVerified || false,
              emergencyAvailable: false,
              freeEstimates: true,
              tradeProfileId: company.id,
              serviceAreas: [],
              hoursOfOperation: null,
              socialLinks: null,
              paymentMethods: [],
              languages: [],
              warrantyInfo: null,
              workHistory: [],
              lookingFor: [],
              skills: [],
              foundedYear: null,
              teamSize: null,
              rocNumber: null,
              insuranceProvider: null,
              bondAmount: null,
              isLicensed: false,
              isBonded: false,
              isInsured: false,
            },
            alreadyConnected: false,
            hasReviewed: false,
          });
        }
      }
    }

    // ── Step 3: Try as Clerk userId ──
    if (!member) {
      member = await prisma.tradesCompanyMember.findFirst({
        where: { userId: profileId },
        select: MEMBER_SELECT,
      });
    }

    // ── Step 4: Try slug match via company ──
    if (!member) {
      const companyBySlug = await prisma.tradesCompany.findFirst({
        where: { slug: profileId },
        include: {
          members: {
            take: 1,
            select: MEMBER_SELECT,
          },
        },
      });
      if (companyBySlug && companyBySlug.members.length > 0) {
        member = companyBySlug.members[0];
      }
    }

    if (!member) {
      logger.warn("[TRADES_PROFILE_PUBLIC] Profile not found", { profileId });
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // ── Build response ──
    const profile = formatProfile(member);

    // ── Optional auth — check connection/review status ──
    let alreadyConnected = false;
    let hasReviewed = false;

    try {
      const authCtx = await safeOrgContext();

      if (authCtx.ok && authCtx.userId) {
        const client = await prisma.client.findFirst({
          where: { userId: authCtx.userId },
        });

        if (client) {
          const connection = await prisma.clientProConnection.findFirst({
            where: {
              clientId: client.id,
              contractorId: member.id,
            },
          });

          const s = connection?.status?.toLowerCase();
          alreadyConnected = s === "accepted" || s === "connected" || s === "pending";

          if (s === "accepted" || s === "connected") {
            const existingReview = await prisma.trade_reviews.findFirst({
              where: {
                contractorId: member.id,
                clientId: client.id,
              },
            });
            hasReviewed = !!existingReview;
          }
        }
      }
    } catch {
      // Auth is optional — public endpoint works without auth
    }

    return NextResponse.json({
      profile,
      alreadyConnected,
      hasReviewed,
    });
  } catch (error) {
    logger.error("[TRADES_PROFILE_PUBLIC] Error", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
