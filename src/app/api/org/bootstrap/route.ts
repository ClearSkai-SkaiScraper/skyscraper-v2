export const dynamic = "force-dynamic";

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

// eslint-disable-next-line no-restricted-imports
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const bootstrapSchema = z.object({
  orgName: z.string().trim().min(1).max(100).optional(),
});

export async function POST(req: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId, orgId: clerkOrgId } = await auth();

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // ── GUARD: Check for pending invitations ──────────────────────────
    // If the user was invited to a team, they should accept the invite
    // rather than creating their own org (which creates a phantom org).
    try {
      const pendingInvites = await prisma.$queryRaw<Array<{ id: string; org_id: string }>>`
        SELECT id, org_id FROM team_invitations
        WHERE status = 'pending'
          AND expires_at > NOW()
          AND email IN (
            SELECT email FROM users WHERE "clerkUserId" = ${userId}
          )
        LIMIT 1
      `;

      if (pendingInvites.length > 0) {
        logger.warn("[bootstrap] User has pending invite — blocking org creation", {
          userId,
          inviteOrgId: pendingInvites[0].org_id,
        });
        return NextResponse.json(
          {
            ok: false,
            error:
              "You have a pending team invitation. Please accept it before creating a new organization.",
            pendingInvite: true,
            inviteId: pendingInvites[0].id,
          },
          { status: 409 }
        );
      }
    } catch {
      // Non-fatal: table may not exist
    }

    // Parse optional org name from request body (validated with Zod)
    let customOrgName: string | undefined;
    try {
      const raw = await req.json();
      const parsed = bootstrapSchema.safeParse(raw);
      if (parsed.success && parsed.data.orgName) {
        customOrgName = parsed.data.orgName;
      }
    } catch {
      // Body may be empty — that's fine
    }

    const user = await currentUser();
    const userName = user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "User"
      : "User";
    const userEmail =
      user?.emailAddresses?.[0]?.emailAddress ||
      // eslint-disable-next-line no-restricted-syntax
      `${userId}@${process.env.EMAIL_DOMAIN || "skaiscrape.com"}`;

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
              planKey: "SOLO",
              videoEnabled: false,
              aiModeDefault: "auto",
              aiCacheEnabled: true,
              aiDedupeEnabled: true,
              demoMode: false,
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

        // Also check for orgs created by ensureOrgForUser (org_${userId} pattern)
        if (!org) {
          const autoCreatedOrg = await tx.org.findFirst({
            where: {
              clerkOrgId: {
                in: [`org_${userId}`, `auto_${userId}`, userId],
              },
            },
            select: { id: true, name: true, clerkOrgId: true },
          });
          if (autoCreatedOrg) {
            org = autoCreatedOrg;
            logger.debug("[bootstrap] Found auto-created org:", org.id);
          }
        }

        if (!org) {
          // Create new personal org — DETERMINISTIC clerkOrgId to prevent duplicates
          const newOrgId = crypto.randomUUID();
          const newClerkOrgId = `org_${userId}`;

          org = await tx.org.upsert({
            where: { clerkOrgId: newClerkOrgId },
            create: {
              id: newOrgId,
              clerkOrgId: newClerkOrgId,
              name: customOrgName || `${userName}'s Organization`,
              planKey: "SOLO",
              videoEnabled: false,
              aiModeDefault: "auto",
              aiCacheEnabled: true,
              aiDedupeEnabled: true,
              demoMode: false,
              updatedAt: new Date(),
            },
            update: {},
            select: { id: true, name: true, clerkOrgId: true },
          });
          created = org.id === newOrgId;
          logger.debug(`[bootstrap] Upserted personal org: ${org.id} created: ${created}`);
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

      // STEP 3: Ensure user record exists (handle email uniqueness gracefully)
      try {
        await tx.users.upsert({
          where: { clerkUserId: userId },
          create: {
            id: userId,
            clerkUserId: userId,
            email: userEmail,
            name: userName,
            orgId: org.id,
          },
          update: { orgId: org.id, name: userName },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (userErr: any) {
        // Handle email unique constraint conflict — another clerk user might have same email
        if (userErr?.code === "P2002" && userErr?.meta?.target?.includes?.("email")) {
          logger.warn(`[bootstrap] Email conflict for ${userEmail}, using fallback email`);
          // eslint-disable-next-line no-restricted-syntax
          const fallbackEmail = `${userId}@${process.env.EMAIL_DOMAIN || "skaiscrape.com"}`;
          await tx.users.upsert({
            where: { clerkUserId: userId },
            create: {
              id: userId,
              clerkUserId: userId,
              email: fallbackEmail,
              name: userName,
              orgId: org.id,
            },
            update: { orgId: org.id, name: userName },
          });
        } else {
          throw userErr; // Re-throw non-email errors
        }
      }

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const errorMessage = error?.message || "Unknown error";
    const errorCode = error?.code || "UNKNOWN";

    // Classify error for better user feedback
    let userMessage = "Bootstrap failed";
    let suggestedAction = "Please try again. If the problem persists, contact support.";

    if (errorCode === "P2002") {
      // Unique constraint violation - likely duplicate org or membership
      userMessage = "Organization already exists or duplicate entry detected";
      suggestedAction = "Try refreshing the page. You may already have an organization.";
    } else if (errorCode === "P2003") {
      // Foreign key constraint - missing related record
      userMessage = "Database relationship error";
      suggestedAction = "Please contact support with this error code.";
    } else if (errorMessage.includes("connect") || errorMessage.includes("timeout")) {
      userMessage = "Database connection issue";
      suggestedAction = "Please wait a moment and try again.";
    } else if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("ECONNREFUSED")) {
      userMessage = "Service temporarily unavailable";
      suggestedAction = "Please wait a moment and try again.";
    }

    logger.error("[bootstrap] Error:", {
      message: errorMessage,
      code: errorCode,
      stack: error?.stack,
      userMessage,
    });

    return NextResponse.json(
      {
        ok: false,
        error: userMessage,
        // eslint-disable-next-line no-restricted-syntax
        detail: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        code: errorCode,
        suggestedAction,
      },
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
