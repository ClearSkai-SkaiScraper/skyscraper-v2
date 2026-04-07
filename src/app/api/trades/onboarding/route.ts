export const dynamic = "force-dynamic";

/**
 * Trades Network Onboarding API
 * Phase 1: Employee Profile Creation & Company Linking
 *
 * POST /api/trades/onboarding
 * Handles the multi-step onboarding flow:
 * 1. Create employee profile
 * 2. Generate/join pending company
 * 3. Check if 3+ employees linked
 * 4. Enable admin to create company page
 */

import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const onboardingSchema = z.object({
  step: z.string().min(1, "step is required"),
  data: z.record(z.any()).optional().default({}),
});

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    logger.debug("[Trades Onboarding] Processing for userId:", userId);

    const raw = await req.json();
    const parsed = onboardingSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { step, data } = parsed.data;

    logger.debug(
      `[Trades Onboarding] Step: ${step} Data keys: ${Object.keys(data || {}).join(", ")}`
    );

    // ========================================================================
    // QUICK UPDATE: AVATAR ONLY
    // ========================================================================
    if (step === "update_avatar") {
      const { avatar } = data;

      // First check if the member exists
      const existingMember = await prisma.tradesCompanyMember.findFirst({
        where: { userId },
      });

      if (!existingMember) {
        // Create the member first with basic info
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress || `${userId}@example.invalid`;
        const firstName = user?.firstName || "";
        const lastName = user?.lastName || "";

        const newMember = await prisma.tradesCompanyMember.create({
          data: {
            userId,
            firstName,
            lastName,
            email,
            avatar: avatar || null,
            status: "active",
            onboardingStep: "create_profile",
          },
        });

        return NextResponse.json({
          success: true,
          profile: newMember,
          message: "Profile created with avatar",
        });
      }

      const updated = await prisma.tradesCompanyMember.update({
        where: { userId },
        data: {
          avatar: avatar || null,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        profile: updated,
      });
    }

    // ========================================================================
    // QUICK UPDATE: COVER PHOTO ONLY
    // ========================================================================
    if (step === "update_cover") {
      const { coverPhoto } = data;

      const existingMember = await prisma.tradesCompanyMember.findFirst({
        where: { userId },
      });

      if (!existingMember) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      const updated = await prisma.tradesCompanyMember.update({
        where: { userId },
        data: {
          coverPhoto: coverPhoto || null,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        profile: updated,
      });
    }

    // ========================================================================
    // QUICK UPDATE: SPECIALTIES ONLY
    // ========================================================================
    if (step === "update_specialties") {
      const { specialties } = data;

      const existingMember = await prisma.tradesCompanyMember.findFirst({
        where: { userId },
      });

      if (!existingMember) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      const updated = await prisma.tradesCompanyMember.update({
        where: { userId },
        data: {
          specialties: Array.isArray(specialties) ? specialties : [],
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        profile: updated,
      });
    }

    // ========================================================================
    // STEP 1: CREATE EMPLOYEE PROFILE
    // ========================================================================
    if (step === "create_profile") {
      const {
        firstName,
        lastName,
        email,
        phone,
        title,
        jobTitle,
        tradeType,
        specialties,
        yearsExperience,
        bio,
        avatar,
        coverPhoto,
        city,
        state,
        workHistory,
        lookingFor,
        // Company details (user-managed, no admin requirement)
        companyName,
        companyLogo,
        foundedYear,
        rocNumber,
        companyLicense,
        isLicensed,
        isBonded,
        isInsured,
        insuranceProvider,
        bondAmount,
        officePhone,
        companyWebsite,
        // New professional fields
        licenseNumber,
        licenseState,
        businessEntityType,
        insurancePolicyNumber,
        additionalNotes,
        coverageTypes,
      } = data;

      // Resolve orgId but never block profile creation if helper fails
      // orgId is already available from withAuth context

      // Ensure we always have a non-empty email for required column
      let finalEmail: string = typeof email === "string" ? email : "";
      if (!finalEmail) {
        const user = await currentUser().catch(() => null);
        finalEmail =
          (user?.primaryEmailAddress?.emailAddress as string | undefined) ||
          `${userId}@example.invalid`;
      }

      // Check if user already has a profile
      const existing = await prisma.tradesCompanyMember.findFirst({
        where: { userId },
      });

      // Create or update employee profile with all fields. We never hard-fail
      // here so that users can safely re-run onboarding to edit their profile.
      // Note: workHistory is a String? field, so we stringify if it's an array
      const workHistoryStr = Array.isArray(workHistory)
        ? workHistory.length > 0
          ? JSON.stringify(workHistory)
          : null
        : typeof workHistory === "string"
          ? workHistory
          : null;

      logger.info("[Trades Onboarding] About to save profile with data:", {
        userId,
        firstName,
        lastName,
        email: finalEmail,
        orgId,
        existing: !!existing,
        avatarProvided: avatar !== undefined,
      });

      // Build base update data (only update avatar if explicitly provided)
      const baseData = {
        firstName,
        lastName,
        email: finalEmail,
        phone,
        title: title || null,
        jobTitle: jobTitle || null,
        tradeType: tradeType || null,
        specialties: specialties || [],
        yearsExperience: yearsExperience ? parseInt(yearsExperience) : null,
        bio: bio || null,
        city: city || null,
        state: state || null,
        workHistory: workHistoryStr,
        lookingFor: lookingFor || [],
        onboardingStep: "complete",
        status: "active",
        orgId,
        // Company details (user-managed)
        companyName: companyName || null,
        foundedYear: foundedYear ? parseInt(foundedYear) : null,
        rocNumber: rocNumber || null,
        companyLicense: companyLicense || rocNumber || null,
        insuranceProvider: isInsured ? insuranceProvider || "Yes" : null,
        bondAmount: isBonded ? bondAmount || "Yes" : null,
        officePhone: officePhone || null,
        companyWebsite: companyWebsite || null,
        // New professional fields
        licenseNumber: licenseNumber || null,
        licenseState: licenseState || null,
        businessEntityType: businessEntityType || null,
        isBonded: isBonded === true || isBonded === "true" ? true : false,
        isInsured: isInsured === true || isInsured === "true" ? true : false,
        insurancePolicyNumber: insurancePolicyNumber || null,
        additionalNotes: additionalNotes || null,
        coverageTypes: Array.isArray(coverageTypes) ? coverageTypes : [],
        // Only include avatar/coverPhoto/logo in update if explicitly provided
        ...(avatar !== undefined ? { avatar: avatar || null } : {}),
        ...(coverPhoto !== undefined ? { coverPhoto: coverPhoto || null } : {}),
        ...(companyLogo !== undefined ? { profilePhoto: companyLogo || null } : {}),
      };

      let profile;
      try {
        profile = existing
          ? await prisma.tradesCompanyMember.update({
              where: { userId },
              data: baseData,
            })
          : await prisma.tradesCompanyMember.create({
              data: {
                userId,
                ...baseData,
                // For new profiles, include avatar/coverPhoto even if null
                avatar: avatar || null,
                coverPhoto: coverPhoto || null,
              },
            });
      } catch (prismaError: unknown) {
        logger.error("[Trades Onboarding] Prisma error:", prismaError);
        return NextResponse.json(
          {
            error: "Database error while saving profile",
            details: prismaError instanceof Error ? prismaError.message : "Unknown error",
            code: (prismaError as any)?.code,
          },
          { status: 500 }
        );
      }

      // Profile created successfully - return the result
      // Note: tradesCompanyMember is the canonical profile model
      logger.info("[Trades Onboarding] ✅ Profile saved successfully:", {
        id: profile.id,
        userId: profile.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        onboardingStep: profile.onboardingStep,
        status: profile.status,
      });

      return NextResponse.json({
        success: true,
        profile,
        nextStep: "link_company",
      });
    }

    // ========================================================================
    // STEP 2A: CREATE PENDING COMPANY (First Employee)
    // ========================================================================
    if (step === "create_pending_company") {
      const { companyName } = data;

      // Get employee profile
      const employee = await prisma.tradesCompanyMember.findFirst({
        where: { userId },
      });

      if (!employee) {
        return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
      }

      // Generate unique token for this pending company
      const token = `${companyName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

      // Update employee with pending company info
      await prisma.tradesCompanyMember.update({
        where: { id: employee.id },
        data: {
          pendingCompanyToken: token,
          companyName: companyName, // Store company name on member
          onboardingStep: "pending_admin",
          isAdmin: true, // First person becomes admin
        },
      });

      // Generate shareable invite link
      const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/trades/join/${token}`;

      return NextResponse.json({
        success: true,
        token,
        inviteLink,
        companyName,
        message: "Share this link with 2+ employees to create your company page",
      });
    }

    // ========================================================================
    // STEP 2B: JOIN PENDING COMPANY (Subsequent Employees)
    // ========================================================================
    if (step === "join_pending_company") {
      const { token } = data;

      // Get employee profile
      const employee = await prisma.tradesCompanyMember.findFirst({
        where: { userId },
      });

      if (!employee) {
        return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
      }

      // Find the admin/creator of this pending company by token
      const adminMember = await prisma.tradesCompanyMember.findFirst({
        where: {
          pendingCompanyToken: token,
          isAdmin: true,
        },
      });

      if (!adminMember) {
        return NextResponse.json({ error: "Invalid or expired invite token" }, { status: 400 });
      }

      // Update employee with pending company info
      await prisma.tradesCompanyMember.update({
        where: { id: employee.id },
        data: {
          companyName: adminMember.companyName, // Copy company name from admin
          pendingCompanyToken: token,
          onboardingStep: "pending_admin",
        },
      });

      // Check if we have 3+ employees now (informational only)
      const employeeCount = await prisma.tradesCompanyMember.count({
        where: {
          pendingCompanyToken: token,
          companyId: null,
          status: "active",
        },
      });

      // Allow any user to create company immediately (no minimum employee requirement)
      const canCreate = true;

      return NextResponse.json({
        success: true,
        employeeCount,
        companyName: adminMember.companyName,
        canCreateCompany: canCreate,
        message: "Ready to create company page! You can add more employees later.",
      });
    }

    // ========================================================================
    // STEP 3: CREATE COMPANY PAGE (Admin Only, After 3+ Employees)
    // ========================================================================
    if (step === "create_company") {
      const {
        companyName,
        slug,
        bio,
        website,
        phone,
        email,
        address,
        city,
        state,
        zip,
        businessType,
        licenseNumber,
        licenseState,
        specialties,
        yearsInBusiness,
      } = data;

      // orgId available from withAuth context

      // Get employee profile
      const employee = await prisma.tradesCompanyMember.findFirst({
        where: { userId },
      });

      if (!employee || !employee.isAdmin) {
        return NextResponse.json({ error: "Only admin can create company page" }, { status: 403 });
      }

      if (!employee.pendingCompanyToken) {
        return NextResponse.json({ error: "No pending company found" }, { status: 400 });
      }

      // Count employees (informational only - no minimum required per user directive)
      const employeeCount = await prisma.tradesCompanyMember.count({
        where: {
          pendingCompanyToken: employee.pendingCompanyToken,
          companyId: null,
          status: "active",
        },
      });

      // NOTE: User can create company with any number of employees
      // They can add more employees later and connect company page when ready

      // Check slug availability
      const existingSlug = await prisma.tradesCompany.findUnique({
        where: { slug },
      });

      if (existingSlug) {
        return NextResponse.json({ error: "Slug already taken" }, { status: 400 });
      }

      // Create company
      const company = await prisma.tradesCompany.create({
        data: {
          name: companyName,
          slug,
          description: bio,
          website,
          phone,
          email,
          address,
          city,
          state: state || "AZ",
          zip,
          licenseNumber,
          specialties: specialties || [],
          yearsInBusiness: yearsInBusiness ? parseInt(yearsInBusiness) : null,
          isVerified: false, // Requires verification
          isActive: true,
        },
      });

      // Link all pending employees to this company
      await prisma.tradesCompanyMember.updateMany({
        where: {
          pendingCompanyToken: employee.pendingCompanyToken,
          companyId: null,
          status: "active",
        },
        data: {
          companyId: company.id,
          onboardingStep: "complete",
          canEditCompany: true,
          pendingCompanyToken: null, // Clear the pending token
        },
      });

      return NextResponse.json({
        success: true,
        company,
        employeeCount,
        message: "Company created successfully! All employees have been linked.",
      });
    }

    // ========================================================================
    // DEFAULT: Invalid Step
    // ========================================================================
    return NextResponse.json(
      {
        error:
          "Invalid step. Must be: create_profile, create_pending_company, join_pending_company, or create_company",
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    logger.error("[Trades Onboarding Error]", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: "Internal server error",
      },
      { status: 500 }
    );
  }
});

/**
 * GET /api/trades/onboarding
 * Get current onboarding status for logged-in user
 */
export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    // Get employee profile
    const employee = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      include: {
        company: true,
      },
    });

    if (!employee) {
      return NextResponse.json({
        hasProfile: false,
        nextStep: "create_profile",
      });
    }

    // If already linked to company
    if (employee.companyId) {
      return NextResponse.json({
        hasProfile: true,
        employee,
        company: employee.company,
        onboardingComplete: true,
      });
    }

    // If in pending state
    if (employee.pendingCompanyToken) {
      const employeeCount = await prisma.tradesCompanyMember.count({
        where: {
          pendingCompanyToken: employee.pendingCompanyToken,
          companyId: null,
          status: "active",
        },
      });

      // Allow any user to create company immediately (no minimum employee requirement)
      const canCreate = true;

      return NextResponse.json({
        hasProfile: true,
        employee,
        pendingCompany: {
          name: "Pending Company", // Default name since not stored
          token: employee.pendingCompanyToken,
          employeeCount,
          canCreateCompany: canCreate,
        },
        onboardingComplete: false,
        nextStep: "create_company",
      });
    }

    // Has profile but not linked
    return NextResponse.json({
      hasProfile: true,
      employee,
      onboardingComplete: false,
      nextStep: "link_company",
    });
  } catch (error: unknown) {
    logger.error("[Trades Onboarding Status Error]", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: "Internal server error",
      },
      { status: 500 }
    );
  }
});
