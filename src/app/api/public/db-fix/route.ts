/**
 * COMPLETELY AUTH-FREE database fix
 * Directly queries the database without ANY Clerk involvement
 * GET /api/public/db-fix?userId=YOUR_CLERK_USER_ID
 */
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const steps: any[] = [];

  try {
    // Get userId from query param (since we can't use Clerk auth)
    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId) {
      // If no userId provided, list all users so they can pick one
      const users = await prisma.users.findMany({
        take: 10,
        select: { id: true, clerkUserId: true, email: true, name: true },
      });

      const memberships = await prisma.user_organizations.findMany({
        take: 20,
        select: { userId: true, organizationId: true, role: true },
      });

      return NextResponse.json({
        ok: false,
        error: "No userId provided",
        usage: "Add ?userId=YOUR_CLERK_USER_ID to the URL",
        existingUsers: users,
        existingMemberships: memberships,
      });
    }

    steps.push({ step: "using_userId", userId });

    // Step 1: Delete ALL existing memberships for this user
    const deletedMemberships = await prisma.user_organizations.deleteMany({
      where: { userId },
    });
    steps.push({ step: "delete_memberships", deleted: deletedMemberships.count });

    // Step 2: Find existing org OR create one
    // First try to find an existing org we can use
    let org = await prisma.org.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!org) {
      // Create new org only if none exist
      const orgId = `org-${Date.now()}`;
      const now = new Date();
      org = await prisma.org.create({
        data: {
          id: orgId,
          name: "My Organization",
          clerkOrgId: `clerk-${orgId}`,
          createdAt: now,
          updatedAt: now,
        },
      });
      steps.push({ step: "create_org", orgId: org.id });
    } else {
      steps.push({ step: "use_existing_org", orgId: org.id });
    }

    // Step 3: Create membership
    await prisma.user_organizations.create({
      data: {
        userId,
        organizationId: org.id,
        role: "OWNER",
      },
    });
    steps.push({ step: "create_membership", orgId: org.id });

    // Step 4: Upsert user record
    await prisma.users.upsert({
      where: { clerkUserId: userId },
      update: { orgId: org.id },
      create: {
        id: `user-${Date.now()}`,
        clerkUserId: userId,
        email: "user@example.com",
        name: "User",
        orgId: org.id,
        role: "ADMIN",
      },
    });
    steps.push({ step: "upsert_user" });

    // Step 5: Create demo contact first (required for property)
    const contactId = `demo-contact-${org.id}`;
    await prisma.contacts.upsert({
      where: { id: contactId },
      update: {},
      create: {
        id: contactId,
        orgId: org.id,
        slug: `john-smith-${org.id.slice(0, 8)}`,
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@example.com",
        phone: "(555) 123-4567",
        street: "123 Main Street",
        city: "Phoenix",
        state: "AZ",
        zipCode: "85001",
        source: "demo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    steps.push({ step: "create_contact", contactId });

    // Step 6: Create demo property
    const propertyId = `demo-property-${org.id}`;
    await prisma.properties.upsert({
      where: { id: propertyId },
      update: {},
      create: {
        id: propertyId,
        orgId: org.id,
        contactId,
        name: "John Smith Property",
        propertyType: "RESIDENTIAL",
        street: "123 Main Street",
        city: "Phoenix",
        state: "AZ",
        zipCode: "85001",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    steps.push({ step: "create_property", propertyId });

    // Step 7: Create demo claim
    const claimId = `demo-claim-${org.id}`;
    const claimNumber = "CLM-DEMO-001";
    await prisma.claims.upsert({
      where: { id: claimId },
      update: {},
      create: {
        id: claimId,
        orgId: org.id,
        propertyId,
        claimNumber,
        title: "John Smith Roof Damage Claim",
        description: "Demo claim for testing the workspace",
        damageType: "STORM",
        status: "new",
        dateOfLoss: new Date("2025-12-01"),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    steps.push({ step: "create_claim", claimId, claimNumber });

    return NextResponse.json({
      ok: true,
      message: "DATABASE FIX COMPLETE - You now have ONE org with ONE demo claim",
      orgId: org.id,
      claimId,
      claimNumber,
      testUrls: {
        claimsList: "http://localhost:3000/claims",
        workspace: `http://localhost:3000/claims/${claimId}`,
      },
      steps,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
        stack: error.stack?.split("\n").slice(0, 5),
        steps,
      },
      { status: 500 }
    );
  }
}
