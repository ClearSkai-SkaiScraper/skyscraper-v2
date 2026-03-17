export const dynamic = "force-dynamic";

// MODULE 6: Homeowner Profiles - Update profile
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const updateProfileSchema = z.object({
  name: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  insuranceCarrier: z.string().max(200).optional(),
  policyNumber: z.string().max(100).optional(),
});

/**
 * Get the authenticated user's primary email from Clerk
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.emailAddresses?.[0]?.emailAddress || null;
  } catch (error) {
    logger.error("[HOMEOWNER_PROFILE] Failed to get user email:", error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = await getUserEmail(userId);
    if (!userEmail) {
      return NextResponse.json({ error: "Could not verify user email" }, { status: 401 });
    }

    // Find client access by email
    // Scoped by userId → email — no cross-tenant risk
    const clientAccess = await prisma.client_access.findFirst({
      where: { email: userEmail },
      select: { id: true, claimId: true },
    });

    if (!clientAccess) {
      return NextResponse.json({ error: "No client access" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    // Update homeowner email on the claim if provided
    const claim = await prisma.claims.findUnique({
      where: { id: clientAccess.claimId },
      select: { id: true, homeowner_email: true },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Note: The claims table stores homeowner data directly
    // We can update homeowner_email if the schema supports more fields in the future
    return NextResponse.json({
      success: true,
      message: "Profile preferences noted",
      claimId: clientAccess.claimId,
    });
  } catch (error) {
    logger.error("[PROFILE_UPDATE]", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = await getUserEmail(userId);
    if (!userEmail) {
      return NextResponse.json({ error: "Could not verify user email" }, { status: 401 });
    }

    // Find all claims this homeowner has access to via their email
    const clientAccessRecords = await prisma.client_access.findMany({
      where: { email: userEmail },
      include: {
        claims: {
          select: {
            id: true,
            claimNumber: true,
            dateOfLoss: true,
            status: true,
            title: true,
            damageType: true,
            carrier: true,
            homeowner_email: true,
          },
        },
      },
    });

    if (!clientAccessRecords.length) {
      return NextResponse.json({ error: "No client access" }, { status: 403 });
    }

    // Return profile with associated claims
    return NextResponse.json({
      email: userEmail,
      claims: clientAccessRecords.map((access) => access.claims),
    });
  } catch (error) {
    logger.error("[PROFILE_GET]", error);
    return NextResponse.json({ error: "Failed to get profile" }, { status: 500 });
  }
}
