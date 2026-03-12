import { logger } from "@/lib/logger";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isPortalAuthError, requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  companyName: z.string().max(200).optional().nullable(),
  category: z
    .enum(["Homeowner", "Business Owner", "Broker", "Realtor", "Property Manager", "Landlord"])
    .optional()
    .default("Homeowner"),
  phone: z.string().max(50).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  postal: z.string().max(20).optional().nullable(),
  preferredContact: z.enum(["email", "phone", "text"]).optional().default("email"),
});

/**
 * Phase 3: Portal Profile API
 * GET - Load homeowner profile
 * POST - Save/update homeowner profile
 */

export async function GET(req: NextRequest) {
  try {
    const authResult = await requirePortalAuth();
    if (isPortalAuthError(authResult)) return authResult;
    const { userId } = authResult;

    // Load client profile and user registry in parallel
    const [client, registry] = await Promise.all([
      prisma.client.findUnique({
        where: { userId },
      }),
      prisma.user_registry.findUnique({
        where: { clerkUserId: userId },
      }),
    ]);

    // Get email from registry (universal table — works for both client & pro users)
    const userEmail = registry?.primaryEmail || registry?.email || null;

    // Determine if onboarding is complete based on:
    // 1. user_registry.onboardingComplete flag
    // 2. OR client profile has essential fields filled (firstName, lastName, phone or address)
    const hasEssentialFields =
      client && ((client.firstName && client.lastName) || client.phone || client.address);
    const onboardingComplete = registry?.onboardingComplete || hasEssentialFields || false;

    // Return in expected format
    const profileData = client
      ? {
          id: client.id,
          userId,
          slug: client.slug,
          name: client.name,
          email: client.email || userEmail,
          firstName: client.firstName,
          lastName: client.lastName,
          companyName: client.companyName,
          category: client.category,
          avatarUrl: client.avatarUrl,
          coverPhotoUrl: client.coverPhotoUrl,
          propertyPhotoUrl: client.propertyPhotoUrl,
          bio: client.bio,
          phone: client.phone,
          address: client.address,
          city: client.city,
          state: client.state,
          postal: client.postal,
          preferredContact: client.preferredContact,
          onboardingComplete,
        }
      : {
          id: null,
          userId,
          slug: null,
          name: null,
          email: userEmail,
          firstName: null,
          lastName: null,
          companyName: null,
          category: "Homeowner",
          avatarUrl: null,
          coverPhotoUrl: null,
          propertyPhotoUrl: null,
          bio: null,
          phone: null,
          address: null,
          city: null,
          state: null,
          postal: null,
          preferredContact: "email",
          onboardingComplete: false,
        };

    return NextResponse.json({ profile: profileData });
  } catch (error) {
    logger.error("[GET /api/portal/profile] Error:", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requirePortalAuth();
    if (isPortalAuthError(authResult)) return authResult;
    const { userId } = authResult;

    const body = await req.json();
    const validated = profileSchema.parse(body);

    // Get email from user_registry (universal table — works for both client & pro users)
    const registryRecord = await prisma.user_registry.findUnique({
      where: { clerkUserId: userId },
      select: { primaryEmail: true, email: true },
    });
    const userEmail = registryRecord?.primaryEmail || registryRecord?.email || null;

    // Build the name from first + last
    const fullName = [validated.firstName, validated.lastName].filter(Boolean).join(" ") || null;

    // Upsert client profile
    const client = await prisma.client.upsert({
      where: { userId },
      create: {
        id: crypto.randomUUID(),
        userId,
        orgId: null,
        slug: nanoid(10),
        name: fullName,
        email: userEmail,
        firstName: validated.firstName || null,
        lastName: validated.lastName || null,
        companyName: validated.companyName || null,
        category: validated.category || "Homeowner",
        phone: validated.phone || null,
        bio: validated.bio || null,
        address: validated.address || null,
        city: validated.city || null,
        state: validated.state || null,
        postal: validated.postal || null,
        preferredContact: validated.preferredContact || "email",
      },
      update: {
        name: fullName,
        firstName: validated.firstName || null,
        lastName: validated.lastName || null,
        companyName: validated.companyName || null,
        category: validated.category || undefined,
        phone: validated.phone || null,
        bio: validated.bio || null,
        address: validated.address || null,
        city: validated.city || null,
        state: validated.state || null,
        postal: validated.postal || null,
        preferredContact: validated.preferredContact || undefined,
        updatedAt: new Date(),
      },
    });

    // Mark onboarding as complete in user_registry when profile is saved
    // This ensures the onboarding wizard won't show again
    await prisma.user_registry.upsert({
      where: { clerkUserId: userId },
      create: {
        clerkUserId: userId,
        userType: "client",
        onboardingComplete: true,
      },
      update: {
        onboardingComplete: true,
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: client.id,
        userId: client.userId,
        slug: client.slug,
        name: client.name,
        firstName: client.firstName,
        lastName: client.lastName,
        companyName: client.companyName,
        category: client.category,
        avatarUrl: client.avatarUrl,
        coverPhotoUrl: client.coverPhotoUrl,
        propertyPhotoUrl: client.propertyPhotoUrl,
        bio: client.bio,
        phone: client.phone,
        address: client.address,
        city: client.city,
        state: client.state,
        postal: client.postal,
        preferredContact: client.preferredContact,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("[POST /api/portal/profile] Error:", error);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
