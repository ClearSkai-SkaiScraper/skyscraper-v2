/**
 * ============================================================================
 * BULLETPROOF ORG CONTEXT HELPER - NO MORE WHITE SCREENS
 * ============================================================================
 *
 * This function GUARANTEES that any authenticated user has:
 * 1. A valid organization record (Org table)
 * 2. A user_organizations membership linking them
 * 3. Auto-healing: finds org by email domain or creates new one
 * 4. Clear error logging instead of silent white screen crashes
 *
 * USE THIS EVERYWHERE for Pro sign-in flow and layout rendering.
 * ============================================================================
 */

import { currentUser } from "@clerk/nextjs/server";
import type { Org } from "@prisma/client";
import { redirect } from "next/navigation";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface EnsuredOrg {
  orgId: string;
  userId: string;
  role: string;
  orgName: string;
  membershipId: string;
  isNew: boolean; // true if org was just created
}

function safeSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function ensureOrgForUser(): Promise<EnsuredOrg> {
  const user = await currentUser();

  if (!user) {
    logger.debug("[ensureOrgForUser] No authenticated user - redirecting to sign-in");
    redirect("/sign-in?redirect_url=/dashboard");
  }

  const userId = user.id;
  const primaryEmail = user.emailAddresses?.[0]?.emailAddress || null;

  try {
    // 🔥 CANONICAL ORG FIX: Look for org with most claims FIRST (stop org spam)
    // This ensures we reuse the populated org instead of creating empty ones
    const existingMemberships = await prisma.user_organizations.findMany({
      where: { userId },
      include: {
        Org: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (existingMemberships.length > 0) {
      // Count claims for each org to find canonical org
      const membershipsWithCounts = await Promise.all(
        existingMemberships.map(async (m) => {
          if (!m.organizationId || !m.Org) {
            return { ...m, claimsCount: 0 };
          }

          const claimsCount = await prisma.claims.count({ where: { orgId: m.organizationId } });
          return { ...m, claimsCount };
        })
      );

      const membershipsWithOrgs = membershipsWithCounts.filter(
        (m) => Boolean(m.organizationId) && Boolean(m.Org)
      );

      if (membershipsWithOrgs.length === 0) {
        // 🔥 ACTUAL FIX: If memberships exist but all orgs are deleted,
        // delete the orphaned memberships so we can create a fresh org
        console.warn(
          "[ensureOrgForUser] ⚠️ Existing memberships point to deleted orgs - cleaning up orphaned memberships"
        );

        // Delete orphaned memberships
        const orphanedIds = existingMemberships.map((m) => m.id);
        await prisma.user_organizations.deleteMany({
          where: { id: { in: orphanedIds } },
        });
        logger.debug(`[ensureOrgForUser] Deleted ${orphanedIds.length} orphaned memberships`);

        // Fall through to create new org below
      } else {
        // Find org with claims, fallback to oldest
        const canonicalMembership =
          membershipsWithOrgs.find((m) => m.claimsCount > 0) || membershipsWithOrgs[0];

        console.log(
          "[ensureOrgForUser] Found CANONICAL org:",
          canonicalMembership.organizationId,
          `(${canonicalMembership.claimsCount} claims)`
        );

        return {
          orgId: canonicalMembership.organizationId as string,
          userId,
          role: canonicalMembership.role ?? "ADMIN",
          orgName: canonicalMembership.Org?.name || "My Company",
          membershipId: canonicalMembership.id,
          isNew: false,
        };
      }
    }

    logger.debug("[ensureOrgForUser] No existing memberships - checking for orphaned orgs");

    // 2. AUTO-HEAL: Look for existing org by EXACT clerkOrgId pattern (prevents duplicate org creation)
    let orgToUse: Org | null = null;

    // Try to find org by deterministic clerkOrgId patterns used in auto-creation
    orgToUse = await prisma.org.findFirst({
      where: {
        clerkOrgId: {
          in: [`org_${userId}`, `auto_${userId}`, userId],
        },
      },
      orderBy: { createdAt: "asc" }, // Prefer oldest org with data
    });

    if (orgToUse) {
      logger.debug("[ensureOrgForUser] Found orphaned org by exact clerkOrgId:", orgToUse.id);
    }

    // 3. Email domain matching REMOVED — security risk.
    // Matching orgs by email domain in org name could assign users to the wrong org.
    // Users must be explicitly invited via Clerk org invitations.

    // 4. LAST RESORT: Create new org (but with safeguard to prevent spam)
    if (!orgToUse) {
      // FINAL CHECK: Look for ANY org with exact clerkOrgId pattern to prevent duplication
      const duplicateCheck = await prisma.org.count({
        where: {
          clerkOrgId: {
            in: [`org_${userId}`, `auto_${userId}`, userId],
          },
        },
      });

      if (duplicateCheck > 0) {
        console.error(
          "[ensureOrgForUser] ⚠️ PREVENTED ORG SPAM: Org exists but membership missing. Auto-healing..."
        );
        // Re-fetch the org and create membership instead of new org
        orgToUse = await prisma.org.findFirst({
          where: {
            clerkOrgId: {
              in: [`org_${userId}`, `auto_${userId}`, userId],
            },
          },
          orderBy: { createdAt: "asc" },
        });
      }
    }

    // 5. If STILL no org after all checks → create ONE new org
    let orgCreated = false;
    if (!orgToUse) {
      logger.debug("[ensureOrgForUser] Creating new org for user:", userId);

      const fallbackName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        primaryEmail?.split("@")[0] ||
        "My Company";

      const slugSource = primaryEmail || fallbackName || userId;
      const baseSlug = safeSlug(slugSource) || `org-${userId.slice(0, 8)}`;

      // DETERMINISTIC clerkOrgId — prevents duplicate orgs across concurrent requests
      const clerkOrgId = `org_${userId}`;

      orgToUse = await prisma.org.upsert({
        where: { clerkOrgId },
        update: {},
        create: {
          id: crypto.randomUUID(),
          name: fallbackName,
          clerkOrgId,
          planKey: "SOLO",
          videoEnabled: false,
          aiModeDefault: "auto",
          aiCacheEnabled: true,
          aiDedupeEnabled: true,
          demoMode: false,
          demoSeededAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      orgCreated = true;

      logger.debug("[ensureOrgForUser] Upserted org:", orgToUse.id);
    }

    if (!orgToUse) {
      throw new Error("[ensureOrgForUser] Failed to resolve or create org");
    }

    // 6. Ensure membership exists for this user/org combo (CRITICAL: prevents orphaned orgs)
    const newMembership = await prisma.user_organizations.upsert({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgToUse.id,
        },
      },
      update: {},
      create: {
        id: crypto.randomUUID(),
        userId,
        organizationId: orgToUse.id,
        role: "ADMIN",
        createdAt: new Date(),
      },
    });

    logger.debug("[ensureOrgForUser] Ensured membership:", newMembership.id);

    // Demo seeding REMOVED for enterprise readiness.
    // New orgs start clean — no fake data injected.

    return {
      orgId: orgToUse.id,
      userId,
      role: newMembership.role ?? "ADMIN",
      orgName: orgToUse.name ?? "My Company",
      membershipId: newMembership.id,
      isNew: true,
    };
  } catch (error) {
    logger.error("🚨🚨🚨 [ensureOrgForUser] FATAL ORG CONTEXT ERROR 🚨🚨🚨");
    logger.error("Error details:", error);
    console.error("User ID:", userId);
    console.error("Email:", primaryEmail);
    // Throwing with clear log so we don't get silent white screens
    throw error;
  }
}
