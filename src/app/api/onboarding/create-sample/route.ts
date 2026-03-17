export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/apiAuth";
import { generateContactSlug } from "@/lib/generateContactSlug";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/onboarding/create-sample
 * Creates sample client + property + claim for testing
 * Clearly marked as "SAMPLE" to avoid confusion
 */
export async function POST() {
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { orgId, userId } = authResult;
  if (!orgId) {
    return NextResponse.json({ error: "Organization required." }, { status: 400 });
  }

  const rl = await checkRateLimit(userId, "AUTH");
  if (!rl.success) {
    return NextResponse.json(
      { error: "rate_limit_exceeded", message: "Too many requests" },
      { status: 429 }
    );
  }

  try {
    // Check if sample data already exists
    const existingSample = await prisma.contacts.findFirst({
      where: {
        orgId,
        email: "sample@example.com",
      },
    });

    if (existingSample) {
      return NextResponse.json(
        { error: "Sample data already exists. Delete it first to recreate." },
        { status: 400 }
      );
    }

    // Create sample contact
    const sampleContact = await prisma.contacts.create({
      data: {
        id: `sample-${Date.now()}`,
        orgId,
        firstName: "Sample",
        lastName: "Client",
        slug: generateContactSlug("Sample", "Client"),
        email: "sample@example.com",
        phone: "(555) 123-4567",
        notes: "⚠️ This is SAMPLE DATA created for testing. You can safely delete this.",
        updatedAt: new Date(),
      },
    });

    // Create sample property
    const sampleProperty = await prisma.properties.create({
      data: {
        id: `prop-sample-${Date.now()}`,
        contactId: sampleContact.id,
        orgId,
        name: "123 Sample Street",
        street: "123 Sample Street",
        city: "Sample City",
        state: "TX",
        zipCode: "75001",
        propertyType: "residential",
        updatedAt: new Date(),
      },
    });

    // Create sample claim
    const sampleClaim = await prisma.claims.create({
      data: {
        id: `claim-sample-${Date.now()}`,
        orgId,
        clientId: sampleContact.id,
        propertyId: sampleProperty.id,
        claimNumber: `SAMPLE-${Date.now()}`,
        title: "Sample Hail Damage Claim",
        dateOfLoss: new Date("2024-01-15"),
        status: "new",
        description:
          "⚠️ SAMPLE CLAIM - Roof damage from hailstorm. This is test data you can safely delete.",
        damageType: "hail",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        contactId: sampleContact.id,
        propertyId: sampleProperty.id,
        claimId: sampleClaim.id,
      },
      message: "Sample data created successfully! Check your claims to get started.",
    });
  } catch (error) {
    logger.error("[CREATE_SAMPLE] Error:", error);
    return NextResponse.json({ error: "Failed to create sample data" }, { status: 500 });
  }
}

/**
 * DELETE /api/onboarding/create-sample
 * Deletes all sample data for the organization
 */
export async function DELETE() {
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { orgId } = authResult;
  if (!orgId) {
    return NextResponse.json({ error: "Organization required." }, { status: 400 });
  }

  try {
    // Find sample contact
    const sampleContact = await prisma.contacts.findFirst({
      where: {
        orgId,
        email: "sample@example.com",
      },
    });

    if (!sampleContact) {
      return NextResponse.json({ error: "No sample data found to delete" }, { status: 404 });
    }

    // Delete in correct order (claims -> properties -> contact)
    await prisma.claims.deleteMany({
      where: { clientId: sampleContact.id },
    });

    await prisma.properties.deleteMany({
      where: { contactId: sampleContact.id },
    });

    await prisma.contacts.delete({
      where: { id: sampleContact.id },
    });

    return NextResponse.json({
      success: true,
      message: "Sample data deleted successfully",
    });
  } catch (error) {
    logger.error("[DELETE_SAMPLE] Error:", error);
    return NextResponse.json({ error: "Failed to delete sample data" }, { status: 500 });
  }
}
