/**
 * Contractor Profile API
 * GET: Return the tradesCompanyMember profile for the current user
 * POST: Create a new contractor profile with company
 * PUT: Update existing profile
 * PATCH: Allow updating profile fields
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/apiAuth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ============================================================================
// Types
// ============================================================================

interface ContractorProfile {
  id: string;
  userId: string;
  companyId: string | null;
  orgId: string | null;
  role: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  jobTitle: string | null;
  tradeType: string | null;
  bio: string | null;
  avatar: string | null;
  workHistory: string | null;
  skills: string[];
  certifications: string[];
  specialties: string[];
  lookingFor: string[];
  yearsExperience: number | null;
  profilePhoto: string | null;
  coverPhoto: string | null;
  isAdmin: boolean;
  canEditCompany: boolean;
  status: string;
  onboardingStep: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  jobTitle?: string;
  tradeType?: string;
  bio?: string;
  avatar?: string;
  workHistory?: string;
  skills?: string[];
  certifications?: string[];
  specialties?: string[];
  lookingFor?: string[];
  yearsExperience?: number;
  profilePhoto?: string;
  coverPhoto?: string;
}

// Allowed fields for update (whitelist for security)
const ALLOWED_UPDATE_FIELDS: (keyof ProfileUpdateInput)[] = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "title",
  "jobTitle",
  "tradeType",
  "bio",
  "avatar",
  "workHistory",
  "skills",
  "certifications",
  "specialties",
  "lookingFor",
  "yearsExperience",
  "profilePhoto",
  "coverPhoto",
];

// ============================================================================
// GET /api/contractor/profile - Get current user's contractor profile
// ============================================================================

export async function GET() {
  try {
    const authResult = await requireApiAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { userId, user } = authResult;

    // Find the contractor profile for the current user
    const profile = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            isVerified: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        {
          error: "Contractor profile not found",
          message: "You don't have a contractor profile yet. Please complete onboarding.",
          code: "PROFILE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        // Include user info from auth for convenience
        authUser: {
          clerkUserId: user.clerkUserId,
          email: user.email,
        },
      },
    });
  } catch (error) {
    logger.error("[contractor/profile GET] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch contractor profile",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/contractor/profile - Update current user's contractor profile
// ============================================================================

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await requireApiAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { userId } = authResult;

    // Parse request body
    let body: ProfileUpdateInput;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    // Validate that there's something to update
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: "No fields provided for update" }, { status: 400 });
    }

    // Check if profile exists
    const existingProfile = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
    });

    if (!existingProfile) {
      return NextResponse.json(
        {
          error: "Contractor profile not found",
          message: "You don't have a contractor profile yet. Please complete onboarding.",
          code: "PROFILE_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Filter to only allowed fields and validate types
    const updateData: Partial<ProfileUpdateInput> = {};
    const invalidFields: string[] = [];

    for (const key of Object.keys(body) as (keyof ProfileUpdateInput)[]) {
      if (!ALLOWED_UPDATE_FIELDS.includes(key)) {
        invalidFields.push(key);
        continue;
      }

      const value = body[key];

      // Type validation
      switch (key) {
        case "firstName":
        case "lastName":
        case "email":
        case "phone":
        case "title":
        case "jobTitle":
        case "tradeType":
        case "bio":
        case "avatar":
        case "workHistory":
        case "profilePhoto":
        case "coverPhoto":
          if (value !== null && value !== undefined && typeof value !== "string") {
            return NextResponse.json({ error: `Field '${key}' must be a string` }, { status: 400 });
          }
          updateData[key] = value as string;
          break;

        case "skills":
        case "certifications":
        case "specialties":
        case "lookingFor":
          if (!Array.isArray(value)) {
            return NextResponse.json(
              { error: `Field '${key}' must be an array of strings` },
              { status: 400 }
            );
          }
          if (!value.every((item) => typeof item === "string")) {
            return NextResponse.json(
              { error: `Field '${key}' must contain only strings` },
              { status: 400 }
            );
          }
          updateData[key] = value as string[];
          break;

        case "yearsExperience":
          if (value !== null && value !== undefined) {
            const numValue = Number(value);
            if (isNaN(numValue) || numValue < 0 || numValue > 100) {
              return NextResponse.json(
                { error: "yearsExperience must be a number between 0 and 100" },
                { status: 400 }
              );
            }
            updateData[key] = Math.floor(numValue);
          }
          break;
      }
    }

    // Warn about ignored fields (but don't fail)
    if (invalidFields.length > 0) {
      logger.warn(`[contractor/profile PATCH] Ignored invalid fields: ${invalidFields.join(", ")}`);
    }

    // Perform the update
    const updatedProfile = await prisma.tradesCompanyMember.update({
      where: { userId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            isVerified: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      updatedFields: Object.keys(updateData),
      ...(invalidFields.length > 0 && { ignoredFields: invalidFields }),
    });
  } catch (error) {
    logger.error("[contractor/profile PATCH] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to update contractor profile",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/contractor/profile - Create new contractor profile with company
// ============================================================================

interface CreateProfileInput {
  orgId: string;
  userId: string;
  businessName: string;
  slug: string;
  tagline?: string;
  about?: string;
  phone?: string;
  email?: string;
  website?: string;
  primaryTrade?: string;
  services?: string[];
  serviceAreas?: string[];
  licenseNumber?: string;
  emergencyAvailable?: boolean;
  acceptingLeads?: boolean;
  isPublic?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireApiAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { userId: authUserId, user } = authResult;

    // Parse request body
    let body: CreateProfileInput;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    // Validate required fields
    if (!body.businessName) {
      return NextResponse.json({ error: "Business name is required" }, { status: 400 });
    }

    if (!body.orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    // Check if company already exists for this org (via member)
    const existingMember = await prisma.tradesCompanyMember.findFirst({
      where: { orgId: body.orgId },
      include: { company: true },
    });
    const existingCompany = existingMember?.company;

    if (existingCompany) {
      return NextResponse.json(
        { error: "A contractor profile already exists for this organization" },
        { status: 409 }
      );
    }

    // Generate slug if not provided
    const slug =
      body.slug ||
      body.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    // Check if slug is unique
    const slugExists = await prisma.tradesCompany.findUnique({
      where: { slug },
    });

    if (slugExists) {
      return NextResponse.json(
        { error: "This business URL is already taken. Please choose a different name." },
        { status: 409 }
      );
    }

    // Create company and member profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the company
      const company = await tx.tradesCompany.create({
        data: {
          id: crypto.randomUUID(),
          name: body.businessName,
          slug,
          description: body.about || null,
          phone: body.phone || null,
          email: body.email || null,
          website: body.website || null,
          licenseNumber: body.licenseNumber || null,
          specialties: body.services || [],
          serviceArea: body.serviceAreas || [],
          isVerified: false,
          updatedAt: new Date(),
        },
      });

      // Create the member profile (owner)
      const member = await tx.tradesCompanyMember.create({
        data: {
          id: crypto.randomUUID(),
          userId: authUserId,
          companyId: company.id,
          orgId: body.orgId,
          role: "owner",
          firstName: user.name?.split(" ")[0] || null,
          lastName: user.name?.split(" ").slice(1).join(" ") || null,
          email: user.email || body.email || null,
          phone: body.phone || null,
          tradeType: body.primaryTrade || null,
          tagline: body.tagline || null,
          specialties: body.services || [],
          emergencyAvailable: body.emergencyAvailable || false,
          isAdmin: true,
          canEditCompany: true,
          status: "active",
          onboardingStep: "complete",
          updatedAt: new Date(),
        },
      });

      return { company, member };
    });

    logger.info("[contractor/profile POST] Created company and profile:", {
      companyId: result.company.id,
      memberId: result.member.id,
      orgId: body.orgId,
    });

    return NextResponse.json({
      success: true,
      company: result.company,
      profile: result.member,
    });
  } catch (error) {
    logger.error("[contractor/profile POST] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to create contractor profile",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/contractor/profile - Update existing contractor profile and company
// ============================================================================

export async function PUT(req: NextRequest) {
  try {
    const authResult = await requireApiAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { userId: authUserId } = authResult;

    // Parse request body
    let body: CreateProfileInput;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    if (!body.orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    // Find existing company (via member with orgId)
    const existingMemberWithCompany = await prisma.tradesCompanyMember.findFirst({
      where: { orgId: body.orgId },
      include: { company: true },
    });
    const existingCompany = existingMemberWithCompany?.company;

    if (!existingCompany) {
      return NextResponse.json(
        { error: "No contractor profile found for this organization" },
        { status: 404 }
      );
    }

    // Update company and member profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the company
      const company = await tx.tradesCompany.update({
        where: { id: existingCompany.id },
        data: {
          name: body.businessName || existingCompany.name,
          description: body.about ?? existingCompany.description,
          phone: body.phone ?? existingCompany.phone,
          email: body.email ?? existingCompany.email,
          website: body.website ?? existingCompany.website,
          licenseNumber: body.licenseNumber ?? existingCompany.licenseNumber,
          specialties: body.services || existingCompany.specialties,
          serviceArea: body.serviceAreas || existingCompany.serviceArea,
          updatedAt: new Date(),
        },
      });

      // Update or create member profile
      const existingMember = await tx.tradesCompanyMember.findFirst({
        where: { companyId: company.id, userId: authUserId },
      });

      let member;
      if (existingMember) {
        member = await tx.tradesCompanyMember.update({
          where: { id: existingMember.id },
          data: {
            tradeType: body.primaryTrade ?? existingMember.tradeType,
            tagline: body.tagline ?? existingMember.tagline,
            specialties: body.services || existingMember.specialties,
            emergencyAvailable: body.emergencyAvailable ?? existingMember.emergencyAvailable,
            updatedAt: new Date(),
          },
        });
      } else {
        member = await tx.tradesCompanyMember.create({
          data: {
            id: crypto.randomUUID(),
            userId: authUserId,
            companyId: company.id,
            orgId: body.orgId,
            role: "owner",
            tradeType: body.primaryTrade || null,
            tagline: body.tagline || null,
            specialties: body.services || [],
            emergencyAvailable: body.emergencyAvailable || false,
            isAdmin: true,
            canEditCompany: true,
            status: "active",
            onboardingStep: "complete",
            updatedAt: new Date(),
          },
        });
      }

      return { company, member };
    });

    logger.info("[contractor/profile PUT] Updated company and profile:", {
      companyId: result.company.id,
      memberId: result.member.id,
    });

    return NextResponse.json({
      success: true,
      company: result.company,
      profile: result.member,
    });
  } catch (error) {
    logger.error("[contractor/profile PUT] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to update contractor profile",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
