/**
 * POST /api/org/nuclear-reset
 * ============================
 *
 * EMERGENCY ENDPOINT: Completely resets org state for current user.
 *
 * This endpoint:
 * 1. Deletes ALL user_organizations rows for the user
 * 2. Creates a fresh org
 * 3. Creates a fresh membership
 * 4. Seeds demo data
 *
 * Use this when normal repair doesn't work.
 */

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export const POST = withAuth(
  async (req: NextRequest, { orgId, userId }) => {
    try {
      // Rate limit: max 2 resets per hour per user
      const rl = await checkRateLimit(`nuclear-reset:${userId}`, "AI");
      if (!rl.success) {
        return NextResponse.json(
          { ok: false, error: "Rate limit exceeded. Try again later." },
          { status: 429 }
        );
      }

      // Require explicit confirmation in body
      const body = await req.json().catch(() => ({}));
      if (body?.confirm !== "RESET_MY_ORG") {
        return NextResponse.json(
          { ok: false, error: 'Must send { "confirm": "RESET_MY_ORG" } to proceed' },
          { status: 400 }
        );
      }

      // Look up the current org's clerkOrgId for the new org record
      const currentOrg = await prisma.org.findUnique({
        where: { id: orgId },
        select: { clerkOrgId: true },
      });

      const user = await currentUser();
      const userName = user
        ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "User"
        : "User";
      const userEmail = user?.emailAddresses?.[0]?.emailAddress || `${userId}@skaiscrape.com`;

      logger.debug("[NUCLEAR RESET] Starting for user:", userId);

      // STEP 1: Delete ALL existing memberships for this user
      const deletedMemberships = await prisma.user_organizations.deleteMany({
        where: { userId },
      });
      logger.debug(`[NUCLEAR RESET] Deleted ${deletedMemberships.count} memberships`);

      // STEP 2: Create fresh org
      const newOrgId = crypto.randomUUID();
      const effectiveClerkOrgId =
        currentOrg?.clerkOrgId || `personal_${userId.slice(-8)}_${Date.now()}`;

      const org = await prisma.org.create({
        data: {
          id: newOrgId,
          clerkOrgId: effectiveClerkOrgId,
          name: `${userName}'s Organization`,
          demoMode: false,
          updatedAt: new Date(),
        },
      });
      logger.debug("[NUCLEAR RESET] Created org:", org.id);

      // STEP 3: Create membership
      await prisma.user_organizations.create({
        data: {
          userId,
          organizationId: org.id,
          role: "ADMIN",
        },
      });
      logger.debug("[NUCLEAR RESET] Created membership");

      // STEP 4: Ensure user record exists and is linked
      await prisma.users.upsert({
        where: { clerkUserId: userId },
        create: {
          id: crypto.randomUUID(),
          clerkUserId: userId,
          email: userEmail,
          name: userName,
          orgId: org.id,
        },
        update: { orgId: org.id },
      });
      logger.debug("[NUCLEAR RESET] Linked user");

      // STEP 5: Create BillingSettings
      await prisma.billingSettings.create({
        data: {
          id: `billing_${org.id}`,
          orgId: org.id,
          updatedAt: new Date(),
        },
      });
      logger.debug("[NUCLEAR RESET] Created BillingSettings");

      // STEP 6: Create org_branding
      try {
        await prisma.$executeRaw`
        INSERT INTO org_branding ("id", "orgId", "createdAt", "updatedAt")
        VALUES (${crypto.randomUUID()}, ${org.id}, NOW(), NOW())
        ON CONFLICT ("orgId") DO NOTHING
      `;
        logger.debug("[NUCLEAR RESET] Created org_branding");
      } catch (e) {
        logger.warn(
          "[NUCLEAR RESET] Branding skipped:",
          e instanceof Error ? e.message : "Unknown error"
        );
      }

      // STEP 7: Seed demo data
      try {
        await seedDemoData(org.id);
        logger.debug("[NUCLEAR RESET] Seeded demo data");
      } catch (e) {
        logger.warn(
          "[NUCLEAR RESET] Demo seed failed:",
          e instanceof Error ? e.message : "Unknown error"
        );
      }

      // STEP 8: Update org to mark demo as seeded
      await prisma.org.update({
        where: { id: org.id },
        data: { demoSeededAt: new Date() },
      });

      logger.debug("[NUCLEAR RESET] ✅ Complete. New orgId:", org.id);

      return NextResponse.json({
        ok: true,
        orgId: org.id,
        orgName: org.name,
        message: "Account completely reset. Please refresh the page.",
      });
    } catch (error) {
      logger.error("[NUCLEAR RESET] Error:", error);
      return NextResponse.json({ ok: false, error: "Reset failed" }, { status: 500 });
    }
  },
  { roles: ["ADMIN", "OWNER"] }
);

async function seedDemoData(orgId: string) {
  const short = orgId.slice(0, 8);
  const now = new Date();

  const ids = {
    contactJohn: `demo-contact-john-${short}`,
    propertyJohn: `demo-property-john-${short}`,
    claimJohn: `demo-claim-john-${short}`,
    claimNumber: `DEMO-${short}-001`,
  };

  // Create contact
  await prisma.contacts.upsert({
    where: { id: ids.contactJohn },
    update: {},
    create: {
      id: ids.contactJohn,
      orgId,
      isDemo: true,
      slug: `john-smith-${ids.contactJohn}`,
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@example.com",
      phone: "(555) 123-4567",
      street: "123 Main Street",
      city: "Phoenix",
      state: "AZ",
      zipCode: "85001",
      source: "demo",
      createdAt: now,
      updatedAt: now,
    },
  });

  // Create property
  await prisma.properties.upsert({
    where: { id: ids.propertyJohn },
    update: {},
    create: {
      id: ids.propertyJohn,
      orgId,
      isDemo: true,
      street: "123 Main Street",
      city: "Phoenix",
      state: "AZ",
      zipCode: "85001",
      propertyType: "residential",
      createdAt: now,
      updatedAt: now,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });

  // Create claim (claims doesn't have contactId, only propertyId)
  await prisma.claims.upsert({
    where: { id: ids.claimJohn },
    update: {},
    create: {
      id: ids.claimJohn,
      orgId,
      isDemo: true,
      claimNumber: ids.claimNumber,
      title: "Demo Insurance Claim - Hail Damage",
      status: "in_progress",
      damageType: "hail",
      description: "Demo claim showing hail damage to residential property",
      propertyId: ids.propertyJohn,
      dateOfLoss: now,
      createdAt: now,
      updatedAt: now,
    },
  });

  logger.debug("[seedDemoData] Created demo claim:", ids.claimJohn);
}

// Also add GET to check status
export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    // Get all memberships for user
    const memberships = await prisma.user_organizations.findMany({
      where: { userId },
      include: { Org: { select: { id: true, name: true } } },
    });

    const validMemberships = memberships.filter((m) => m.Org);
    const orphanedMemberships = memberships.filter((m) => !m.Org);

    return NextResponse.json({
      userId,
      totalMemberships: memberships.length,
      validMemberships: validMemberships.length,
      orphanedMemberships: orphanedMemberships.length,
      memberships: memberships.map((m) => ({
        id: m.id,
        organizationId: m.organizationId,
        orgExists: !!m.Org,
        orgName: m.Org?.name || "DELETED",
      })),
    });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
