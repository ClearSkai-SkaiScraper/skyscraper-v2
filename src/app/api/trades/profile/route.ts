import { logger } from "@/lib/logger";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureUserOrgContext } from "@/lib/auth/ensureUserOrgContext";
import prisma from "@/lib/prisma";
import { ensureVendorForOrg } from "@/lib/trades/vendorSync";

const tradesProfileSchema = z.object({
  businessName: z.string().optional(),
  companyName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  licenseState: z.string().optional(),
  baseZip: z.string().optional(),
  zip: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  bio: z.string().optional(),
  website: z.string().optional(),
  yearsExperience: z.union([z.string(), z.number()]).optional(),
  tradeType: z.string().optional(),
  licenseNumber: z.string().optional(),
  serviceAreas: z.array(z.string()).optional(),
});

/**
 * TRADES NETWORK — Trade Profile API
 *
 * Manages tradesCompanyMember profiles (unified trades system).
 *
 * Features:
 * - GET: Load existing member profile
 * - POST: Create new member profile
 * - PATCH: Update profile and sync to vendor directory
 */

// GET /api/trades/profile - Get current user's profile
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("profileId");

    if (profileId) {
      // Get specific profile by ID
      const profile = await prisma.tradesCompanyMember.findUnique({
        where: { id: profileId },
        include: {
          company: true,
          reviews: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });
      return NextResponse.json(profile);
    }

    // Get current user's profile
    const user = await currentUser();
    if (!user) return new NextResponse("User not found", { status: 404 });

    // Resolve org context (non-fatal — profile should still load without it)
    let orgId: string | null = null;
    try {
      const ctx = await ensureUserOrgContext(userId);
      orgId = ctx.orgId;
    } catch (err) {
      logger.warn(
        `[API trades/profile GET] ⚠️ ensureUserOrgContext failed for ${userId}: ${(err as Error).message}`
      );
    }

    // Primary lookup: tradesCompanyMember by userId
    let profile = await prisma.tradesCompanyMember.findUnique({
      where: { userId },
      include: {
        company: true,
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    // Fallback: try email lookup if userId didn't match (handles Clerk account recreation)
    if (!profile) {
      const userEmail = user.emailAddresses?.[0]?.emailAddress;
      if (userEmail) {
        const byEmail = await prisma.tradesCompanyMember.findFirst({
          where: { email: userEmail },
          include: {
            company: true,
            reviews: { orderBy: { createdAt: "desc" }, take: 5 },
          },
        });
        if (byEmail) {
          // Re-link to current userId
          try {
            profile = await prisma.tradesCompanyMember.update({
              where: { id: byEmail.id },
              data: { userId },
              include: {
                company: true,
                reviews: { orderBy: { createdAt: "desc" }, take: 5 },
              },
            });
          } catch {
            profile = byEmail;
          }
        }
      }
    }

    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    // Return profile with normalized fields
    return NextResponse.json({
      profile: {
        ...profile,
        businessName: profile.companyName || profile.company?.name,
        tradeType: profile.tradeType,
        serviceRadius: 50,
        availability: profile.status === "active" ? "AVAILABLE" : "UNAVAILABLE",
      },
    });
  } catch (err) {
    logger.error(
      `[API trades/profile GET] ❌ Unhandled error for request: ${(err as Error).message}`,
      err
    );
    return NextResponse.json(
      { profile: null, error: "Internal server error", detail: (err as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/trades/profile - Create new profile
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    logger.error("[trades/profile POST] ❌ Unauthorized - no userId");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  if (!user) {
    logger.error(`[trades/profile POST] ❌ User ${userId} not found in Clerk`);
    return new NextResponse("User not found", { status: 404 });
  }

  const raw = await req.json();
  const parsed = tradesProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const body = parsed.data;
  let orgId: string;
  try {
    orgId = (await ensureUserOrgContext(userId)).orgId;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("[trades/profile POST] ❌ Failed to resolve orgId", message);
    return NextResponse.json({ error: "Organization context missing" }, { status: 403 });
  }

  try {
    // Check if profile already exists
    const existing = await prisma.tradesCompanyMember.findUnique({
      where: { userId },
    });

    if (existing) {
      // Update instead of create — use nullish coalescing to protect existing data
      const updated = await prisma.tradesCompanyMember.update({
        where: { id: existing.id },
        data: {
          companyName: body.businessName || body.companyName || existing.companyName,
          email: body.email ?? user.primaryEmailAddress?.emailAddress ?? existing.email,
          phone: body.phone ?? existing.phone,
          city: body.city ?? existing.city,
          state: body.state || body.licenseState || existing.state,
          zip: body.baseZip || body.zip || existing.zip,
          specialties: body.specialties ?? existing.specialties ?? [],
          certifications: body.certifications ?? existing.certifications ?? [],
          bio: body.bio ?? existing.bio,
          companyWebsite: body.website ?? existing.companyWebsite,
          yearsExperience: body.yearsExperience
            ? parseInt(String(body.yearsExperience))
            : existing.yearsExperience,
          tradeType: body.tradeType ?? existing.tradeType ?? "GENERAL_CONTRACTOR",
          companyLicense: body.licenseNumber ?? existing.companyLicense,
          serviceArea: body.serviceAreas?.join(", ") || body.baseZip || existing.serviceArea,
          // Preserve identity fields — never blank them
          firstName: existing.firstName,
          lastName: existing.lastName,
          orgId,
          updatedAt: new Date(),
        },
        include: { company: true },
      });

      await ensureVendorForOrg(orgId);

      return NextResponse.json({ profile: updated }, { status: 200 });
    }

    // Create new profile
    // Prefer body-provided names over Clerk's — Clerk may have a different name
    // (e.g. Clerk says "Damien Ray" but user wants "Damien Willingham")
    const profile = await prisma.tradesCompanyMember.create({
      data: {
        userId,
        orgId,
        companyName: body.businessName || body.companyName,
        firstName: body.firstName || user.firstName,
        lastName: body.lastName || user.lastName,
        email: body.email || user.primaryEmailAddress?.emailAddress,
        phone: body.phone,
        city: body.city,
        state: body.state || body.licenseState,
        zip: body.baseZip || body.zip,
        specialties: body.specialties || [],
        certifications: body.certifications || [],
        bio: body.bio,
        companyWebsite: body.website,
        yearsExperience: body.yearsExperience ? parseInt(String(body.yearsExperience)) : null,
        tradeType: body.tradeType || "GENERAL_CONTRACTOR",
        companyLicense: body.licenseNumber,
        serviceArea: body.serviceAreas?.join(", ") || body.baseZip,
        status: "active",
        isActive: true,
        role: "owner",
        isOwner: true,
      },
      include: { company: true },
    });

    // Sync to vendor directory
    await ensureVendorForOrg(orgId);

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    logger.error("[trades/profile POST] ❌ Error creating profile:", {
      message: "Internal server error",
      stack: err.stack?.split("\n")[0],
    });
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }
}

// PATCH /api/trades/profile - Update profile and sync to vendor directory
export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    logger.error("[trades/profile PATCH] ❌ Unauthorized - no userId");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  if (!user) {
    logger.error(`[trades/profile PATCH] ❌ User ${userId} not found in Clerk`);
    return new NextResponse("User not found", { status: 404 });
  }

  let orgId: string;
  try {
    orgId = (await ensureUserOrgContext(userId)).orgId;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("[trades/profile PATCH] ❌ Failed to resolve orgId", message);
    return NextResponse.json({ error: "Organization context required" }, { status: 403 });
  }

  const raw = await req.json();
  const parsed = tradesProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const body = parsed.data;

  try {
    const existing = await prisma.tradesCompanyMember.findUnique({
      where: { userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const profile = await prisma.tradesCompanyMember.update({
      where: { id: existing.id },
      data: {
        // Use nullish coalescing (??) to prevent empty-string wipes
        // Only overwrite if the incoming value is defined AND non-empty
        companyName: body.businessName || body.companyName || existing.companyName,
        email: body.email ?? existing.email,
        phone: body.phone ?? existing.phone,
        city: body.city ?? existing.city,
        state: body.state || body.licenseState || existing.state,
        zip: body.baseZip || body.zip || existing.zip,
        specialties: body.specialties ?? existing.specialties,
        certifications: body.certifications ?? existing.certifications,
        bio: body.bio ?? existing.bio,
        companyWebsite: body.website ?? existing.companyWebsite,
        yearsExperience: body.yearsExperience
          ? parseInt(String(body.yearsExperience))
          : existing.yearsExperience,
        tradeType: body.tradeType ?? existing.tradeType,
        companyLicense: body.licenseNumber ?? existing.companyLicense,
        serviceArea: body.serviceAreas?.join(", ") || body.baseZip || existing.serviceArea,
        // Preserve critical identity fields — never allow blank overwrites
        firstName: existing.firstName,
        lastName: existing.lastName,
        orgId,
        updatedAt: new Date(),
      },
      include: { company: true },
    });

    await ensureVendorForOrg(orgId);

    return NextResponse.json({ profile });
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    logger.error("[trades/profile PATCH] ❌ Error updating profile:", {
      message: "Internal server error",
      stack: err.stack?.split("\n")[0],
    });
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

// Alias PUT to PATCH for compatibility
export async function PUT(req: Request) {
  return PATCH(req);
}
