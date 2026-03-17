export const dynamic = "force-dynamic";

/**
 * 🎯 CLIENT ONBOARDING API
 *
 * Handles saving client profile data from the onboarding wizard.
 * Uses the unified Client model (not the older clients table).
 * Creates/updates user_registry and Client table entries.
 */

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Map wizard client types to Client.category values
const CLIENT_TYPE_MAP: Record<string, string> = {
  homeowner: "Homeowner",
  business_owner: "Business Owner",
  landlord: "Landlord",
  property_manager: "Property Manager",
  broker: "Broker",
  real_estate_agent: "Realtor",
};

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clientType, projectNeeds, projectDescription, idealContractor, photoUrls } = body;

    // Get user email
    const email = user.emailAddresses?.[0]?.emailAddress || "";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const displayName = `${firstName} ${lastName}`.trim() || email.split("@")[0];
    const slug = `client-${userId.slice(-8)}-${nanoid(4)}`;

    // Map client type to category
    const category = CLIENT_TYPE_MAP[clientType] || "Homeowner";

    // Build bio from onboarding data
    const bioLines: string[] = [];
    if (projectDescription) bioLines.push(projectDescription);
    if (idealContractor) bioLines.push(`Looking for: ${idealContractor}`);
    if (projectNeeds?.length > 0) bioLines.push(`Needs: ${projectNeeds.join(", ")}`);
    const bio = bioLines.join("\n\n") || null;

    // Use Client model (the unified one with userId unique constraint)
    const client = await prisma.client.upsert({
      where: { userId },
      create: {
        id: crypto.randomUUID(),
        userId,
        slug,
        name: displayName,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        category,
        bio,
        avatarUrl: user.imageUrl || null,
        propertyPhotoUrl: photoUrls?.[0] || null,
        status: "active",
      },
      update: {
        name: displayName,
        firstName: firstName || null,
        lastName: lastName || null,
        category,
        bio,
        propertyPhotoUrl: photoUrls?.[0] || null,
        updatedAt: new Date(),
      },
    });

    // Update or create user_registry
    await prisma.user_registry.upsert({
      where: { clerkUserId: userId },
      create: {
        clerkUserId: userId,
        clientProfileId: client.id,
        userType: "client",
        displayName,
        primaryEmail: email,
        avatarUrl: user.imageUrl || null,
        onboardingComplete: true,
      },
      update: {
        clientProfileId: client.id,
        userType: "client",
        displayName,
        primaryEmail: email,
        onboardingComplete: true,
        updatedAt: new Date(),
      },
    });

    // Sync to Clerk publicMetadata for middleware routing
    try {
      const clerk = await clerkClient();
      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
          userType: "client",
          onboardingComplete: true,
          clientId: client.id,
        },
      });
    } catch (syncError) {
      logger.error("[CLIENT_ONBOARDING] Clerk sync failed:", syncError);
      // Non-fatal - continue
    }

    return NextResponse.json({
      success: true,
      clientId: client.id,
      slug: client.slug,
      message: "Profile created successfully",
    });
  } catch (error) {
    logger.error("[CLIENT_ONBOARDING] Error:", error);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user needs onboarding
    const registry = await prisma.user_registry.findUnique({
      where: { clerkUserId: userId },
    });

    if (!registry) {
      return NextResponse.json({ needsOnboarding: true });
    }

    if (!registry.onboardingComplete || !registry.clientProfileId) {
      return NextResponse.json({ needsOnboarding: true });
    }

    // Get client profile from unified Client model
    const client = await prisma.client.findFirst({
      where: {
        OR: [{ id: registry.clientProfileId }, { userId: userId }],
      },
    });

    return NextResponse.json({
      needsOnboarding: false,
      profile: client,
    });
  } catch (error) {
    logger.error("[CLIENT_ONBOARDING_GET] Error:", error);
    return NextResponse.json({ error: "Failed to check onboarding status" }, { status: 500 });
  }
}
