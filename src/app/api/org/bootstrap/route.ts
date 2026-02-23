/**
 * POST /api/org/bootstrap
 * ========================
 *
 * THE ONLY place that creates orgs.
 * Called by /onboarding after user confirms setup.
 *
 * Idempotent + transactional:
 * - Creates org if missing
 * - Creates membership if missing
 * - Creates user record if missing
 * - Seeds demo claim if missing
 *
 * Returns: { ok: true, orgId, created: boolean } or { ok: false, error }
 */

import { logger } from "@/lib/logger";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId, orgId: clerkOrgId } = await auth();

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Parse optional org name from request body
    let customOrgName: string | undefined;
    try {
      const body = await req.json();
      if (body?.orgName && typeof body.orgName === "string") {
        customOrgName = body.orgName.trim();
      }
    } catch {
      // Body may be empty — that's fine
    }

    const user = await currentUser();
    const userName = user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "User"
      : "User";
    const userEmail = user?.emailAddresses?.[0]?.emailAddress || `${userId}@skaiscrape.com`;

    logger.debug(`[bootstrap] Starting for user: ${userId} clerkOrgId: ${clerkOrgId}`);

    // Use a transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      let org: { id: string; name: string | null; clerkOrgId: string | null } | null = null;
      let created = false;

      // STEP 0: CRITICAL - Clean up ALL orphaned memberships first
      const allMemberships = await tx.user_organizations.findMany({
        where: { userId },
        include: { Org: { select: { id: true } } },
      });

      const orphanedMemberships = allMemberships.filter((m) => !m.Org);
      if (orphanedMemberships.length > 0) {
        logger.debug(`[bootstrap] Cleaning up ${orphanedMemberships.length} orphaned memberships`);
        await tx.user_organizations.deleteMany({
          where: {
            id: { in: orphanedMemberships.map((m) => m.id) },
          },
        });
      }

      // STEP 1: Find or create org
      if (clerkOrgId) {
        // Clerk org exists - upsert to handle race conditions
        const newOrgId = crypto.randomUUID();
        const existingOrg = await tx.org.findUnique({
          where: { clerkOrgId },
          select: { id: true, name: true, clerkOrgId: true },
        });

        if (existingOrg) {
          org = existingOrg;
        } else {
          // Use upsert to prevent race condition with unique constraint
          org = await tx.org.upsert({
            where: { clerkOrgId },
            create: {
              id: newOrgId,
              clerkOrgId,
              name: customOrgName || `${userName}'s Organization`,
              updatedAt: new Date(),
            },
            update: {}, // Already exists, no update needed
            select: { id: true, name: true, clerkOrgId: true },
          });
          created = org.id === newOrgId; // Only true if we actually created it
          logger.debug(`[bootstrap] Upserted org for Clerk org: ${org.id} created: ${created}`);
        }
      } else {
        // No Clerk org - check existing VALID membership (after cleanup)
        const validMembership = allMemberships.find((m) => m.Org);

        if (validMembership?.Org) {
          org = await tx.org.findUnique({
            where: { id: validMembership.organizationId },
            select: { id: true, name: true, clerkOrgId: true },
          });
          if (org) {
            logger.debug("[bootstrap] Found existing org:", org.id);
          }
        }

        if (!org) {
          // Create new personal org
          const newOrgId = crypto.randomUUID();
          const newClerkOrgId = `personal_${userId.slice(-8)}_${Date.now()}`;

          org = await tx.org.create({
            data: {
              id: newOrgId,
              clerkOrgId: newClerkOrgId,
              name: customOrgName || `${userName}'s Organization`,
              updatedAt: new Date(),
            },
          });
          created = true;
          logger.debug("[bootstrap] Created new personal org:", org.id);
        }
      }

      // STEP 2: Ensure membership exists
      await tx.user_organizations.upsert({
        where: {
          userId_organizationId: { userId, organizationId: org.id },
        },
        create: { userId, organizationId: org.id, role: "owner" },
        update: {},
      });

      // STEP 3: Ensure user record exists
      await tx.users.upsert({
        where: { clerkUserId: userId },
        create: {
          id: userId,
          clerkUserId: userId,
          email: userEmail,
          name: userName,
          orgId: org.id,
        },
        update: { orgId: org.id },
      });

      return { org, created };
    });

    // STEP 4: Seed demo claim (outside transaction - non-critical)
    await seedDemoClaimForOrg(result.org.id);

    logger.debug(`[bootstrap] Complete. OrgId: ${result.org.id} Created: ${result.created}`);

    return NextResponse.json({
      ok: true,
      orgId: result.org.id,
      orgName: result.org.name,
      created: result.created,
    });
  } catch (error) {
    logger.error("[bootstrap] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Bootstrap failed" },
      { status: 500 }
    );
  }
}

/**
 * Seed demo claim for org (idempotent)
 */
async function seedDemoClaimForOrg(orgId: string) {
  try {
    const demoClaimId = `demo-claim-john-smith-${orgId}`;
    const contactId = `demo-contact-${orgId}`;
    const propertyId = `demo-property-${orgId}`;

    // Check if already exists
    const existing = await prisma.claims.findUnique({
      where: { id: demoClaimId },
      select: { id: true },
    });
    if (existing) {
      logger.debug("[seedDemoClaimForOrg] Demo claim already exists:", demoClaimId);
      return;
    }

    // Create contact
    await prisma.contacts.upsert({
      where: { id: contactId },
      create: {
        id: contactId,
        orgId,
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@example.com",
        phone: "(555) 123-4567",
        slug: `john-smith-${orgId.slice(-8)}`,
        updatedAt: new Date(),
      },
      update: {},
    });

    // Create property
    await prisma.properties.upsert({
      where: { id: propertyId },
      create: {
        id: propertyId,
        orgId,
        contactId,
        name: "4521 N 12th St",
        street: "4521 N 12th St",
        city: "Phoenix",
        state: "AZ",
        zipCode: "85014",
        propertyType: "RESIDENTIAL",
        updatedAt: new Date(),
      },
      update: {},
    });

    // Create demo claim
    await prisma.claims.create({
      data: {
        id: demoClaimId,
        orgId,
        propertyId,
        claimNumber: `CLM-${orgId.slice(0, 8)}-001`,
        title: "John Smith Roof Damage Claim",
        description: "Demo claim showing full workspace capabilities. Source: demo",
        status: "active",
        damageType: "STORM",
        dateOfLoss: new Date("2025-12-15"),
        insured_name: "John Smith",
        homeownerEmail: "john.smith@example.com",
        carrier: "State Farm",
        policy_number: "SF-POL-2025-001",
        adjusterName: "Mike Johnson",
        adjusterEmail: "mike.johnson@statefarm.com",
        adjusterPhone: "(555) 987-6543",
        updatedAt: new Date(),
      },
    });

    logger.debug("[seedDemoClaimForOrg] Created demo claim:", demoClaimId);
  } catch (error) {
    // Non-fatal - log and continue
    logger.error("[seedDemoClaimForOrg] Error (non-fatal):", error);
  }
}
