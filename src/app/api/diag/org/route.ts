/**
 * GET /api/diag/org - Organization diagnostic endpoint
 *
 * Returns current user's org context for debugging "claim not found" issues.
 * This helps diagnose:
 * 1. Whether the user is authenticated
 * 2. What org they're resolved to
 * 3. Whether they have claims in their org
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getActiveOrgSafe } from "@/lib/auth/getActiveOrgSafe";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();

  try {
    // Step 1: Get Clerk session
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId: clerkUserId, orgId: clerkOrgId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Not authenticated",
          step: "clerk_auth",
          hint: "Sign in at /sign-in",
        },
        { status: 401 }
      );
    }

    // Step 2: Get active org via our resolver
    const orgResult = await getActiveOrgSafe({ allowAutoCreate: false });

    // Step 3: Get user record from DB
    const dbUser = await prisma.users.findUnique({
      where: { clerkUserId },
      select: {
        id: true,
        email: true,
        name: true,
        orgId: true,
        role: true,
      },
    });

    // Step 4: Get memberships
    const memberships = await prisma.user_organizations.findMany({
      where: { userId: clerkUserId },
      include: {
        Org: {
          select: { id: true, name: true, clerkOrgId: true },
        },
      },
    });

    // Step 5: Get claim count for this org (if we have one)
    let claimCount = 0;
    let sampleClaims: { id: string; claimNumber: string; title: string | null }[] = [];

    if (orgResult.ok) {
      claimCount = await prisma.claims.count({
        where: { orgId: orgResult.org.id },
      });

      sampleClaims = await prisma.claims.findMany({
        where: { orgId: orgResult.org.id },
        select: { id: true, claimNumber: true, title: true },
        take: 5,
        orderBy: { createdAt: "desc" },
      });
    }

    // Step 6: Check for orphaned memberships (memberships pointing to deleted orgs)
    const orphanedMemberships = memberships.filter((m) => !m.Org);

    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      ok: orgResult.ok,
      timestamp: new Date().toISOString(),
      latencyMs: elapsed,

      // Authentication
      auth: {
        clerkUserId,
        clerkOrgId: clerkOrgId || null,
        hasSession: true,
      },

      // Organization resolution
      org: orgResult.ok
        ? {
            resolved: true,
            source: orgResult.source,
            id: orgResult.org.id,
            name: orgResult.org.name,
            clerkOrgId: orgResult.org.clerkOrgId,
          }
        : {
            resolved: false,
            reason: orgResult.reason,
            error: orgResult.error,
          },

      // Database user record
      dbUser: dbUser
        ? {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            legacyOrgId: dbUser.orgId,
            role: dbUser.role,
          }
        : null,

      // Memberships
      memberships: {
        count: memberships.length,
        orphaned: orphanedMemberships.length,
        list: memberships.map((m) => ({
          organizationId: m.organizationId,
          orgName: m.Org?.name || "[DELETED ORG]",
          orgClerkId: m.Org?.clerkOrgId,
          isOrphaned: !m.Org,
        })),
      },

      // Claims in resolved org
      claims: orgResult.ok
        ? {
            count: claimCount,
            samples: sampleClaims.map((c) => ({
              id: c.id,
              claimNumber: c.claimNumber,
              title: c.title,
            })),
          }
        : null,

      // Troubleshooting hints
      hints: generateHints(orgResult, memberships, claimCount, orphanedMemberships.length),
    });
  } catch (error) {
    logger.error("[DIAG_ORG] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Diagnostic failed",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function generateHints(
  orgResult: Awaited<ReturnType<typeof getActiveOrgSafe>>,
  memberships: any[],
  claimCount: number,
  orphanedCount: number
): string[] {
  const hints: string[] = [];

  if (!orgResult.ok) {
    if (orgResult.reason === "NO_SESSION") {
      hints.push("User is not authenticated. Sign in at /sign-in");
    } else if (orgResult.reason === "CREATE_FAILED") {
      hints.push("Organization auto-creation failed. User may have a pending invitation.");
    } else {
      hints.push("Organization could not be resolved. Check memberships table.");
    }
  }

  if (memberships.length === 0) {
    hints.push(
      "No organization memberships found. User needs to complete onboarding or accept an invitation."
    );
  }

  if (orphanedCount > 0) {
    hints.push(
      `Found ${orphanedCount} orphaned membership(s) pointing to deleted orgs. These should be cleaned up.`
    );
  }

  if (memberships.length > 1) {
    hints.push(`User belongs to ${memberships.length} organizations. Using the oldest membership.`);
  }

  if (orgResult.ok && claimCount === 0) {
    hints.push("No claims found in this organization. Create a claim at /claims/new");
  }

  if (orgResult.ok && claimCount > 0) {
    hints.push("Claims exist. If you can't access them, the claim ID in the URL may be incorrect.");
  }

  return hints;
}
