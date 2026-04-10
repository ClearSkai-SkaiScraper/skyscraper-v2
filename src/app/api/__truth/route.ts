/**
 * GET /api/__truth - Comprehensive auth truth endpoint
 *
 * Returns everything about the current auth state:
 * - Clerk session data
 * - DB org resolution
 * - Membership chain
 * - Claim accessibility test
 *
 * Named __truth because it shows the ACTUAL state, not cached assumptions.
 */

// eslint-disable-next-line no-restricted-imports
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getActiveOrgSafe } from "@/lib/auth/getActiveOrgSafe";
import { getTenant } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import { getOrg } from "@/lib/org/getOrg";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const testClaimId = searchParams.get("testClaim");

  try {
    const startTime = Date.now();

    // ──────────────────────────────────────────────────────────────
    // LAYER 1: Raw Clerk data
    // ──────────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId: clerkUserId, orgId: clerkOrgId, sessionClaims } = await auth();
    const clerkUser = clerkUserId ? await currentUser() : null;

    // ──────────────────────────────────────────────────────────────
    // LAYER 2: Our org resolvers (different strategies)
    // ──────────────────────────────────────────────────────────────
    const [activeOrgSafe, tenantResult, getOrgResult] = await Promise.all([
      getActiveOrgSafe({ allowAutoCreate: false }),
      getTenant().catch((e) => ({ error: e.message })),
      getOrg({ mode: "optional" }),
    ]);

    // ──────────────────────────────────────────────────────────────
    // LAYER 3: Database state
    // ──────────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dbState: any = null;

    if (clerkUserId) {
      // Get user record
      const dbUser = await prisma.users.findUnique({
        where: { clerkUserId },
        select: {
          id: true,
          email: true,
          name: true,
          orgId: true,
          role: true,
          createdAt: true,
        },
      });

      // Get all memberships
      const memberships = await prisma.user_organizations.findMany({
        where: { userId: clerkUserId },
        include: {
          Org: {
            select: {
              id: true,
              name: true,
              clerkOrgId: true,
              demoMode: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      // Get all orgs this user could theoretically access
      const orgIds = memberships.filter((m) => m.Org).map((m) => m.Org!.id);

      // Count claims per org
      const claimCounts = await Promise.all(
        orgIds.map(async (orgId) => ({
          orgId,
          count: await prisma.claims.count({ where: { orgId } }),
        }))
      );

      dbState = {
        user: dbUser,
        memberships: memberships.map((m) => ({
          id: m.id,
          organizationId: m.organizationId,
          role: m.role,
          createdAt: m.createdAt,
          org: m.Org
            ? {
                id: m.Org.id,
                name: m.Org.name,
                clerkOrgId: m.Org.clerkOrgId,
                demoMode: m.Org.demoMode,
              }
            : null,
          isOrphaned: !m.Org,
        })),
        claimCounts,
      };
    }

    // ──────────────────────────────────────────────────────────────
    // LAYER 4: Test specific claim access (if requested)
    // ──────────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let claimTest: any = null;

    if (testClaimId && activeOrgSafe.ok) {
      const claim = await prisma.claims.findFirst({
        where: {
          OR: [{ id: testClaimId }, { claimNumber: testClaimId }],
        },
        select: {
          id: true,
          claimNumber: true,
          orgId: true,
          title: true,
        },
      });

      if (!claim) {
        claimTest = {
          found: false,
          testId: testClaimId,
          reason: "NOT_IN_DATABASE",
          hint: "Claim does not exist with this ID or claim number",
        };
      } else if (claim.orgId !== activeOrgSafe.org.id) {
        claimTest = {
          found: true,
          accessible: false,
          testId: testClaimId,
          claimOrgId: claim.orgId,
          userOrgId: activeOrgSafe.org.id,
          reason: "ORG_MISMATCH",
          hint: `Claim belongs to org ${claim.orgId} but you're in org ${activeOrgSafe.org.id}`,
        };
      } else {
        claimTest = {
          found: true,
          accessible: true,
          claim: {
            id: claim.id,
            claimNumber: claim.claimNumber,
            orgId: claim.orgId,
            title: claim.title,
          },
        };
      }
    }

    // ──────────────────────────────────────────────────────────────
    // LAYER 5: Resolution comparison (detect inconsistencies)
    // ──────────────────────────────────────────────────────────────
    const resolvedOrgIds = {
      activeOrgSafe: activeOrgSafe.ok ? activeOrgSafe.org.id : null,
      getTenant: typeof tenantResult === "string" ? tenantResult : null,
      getOrg: getOrgResult.ok ? getOrgResult.orgId : null,
    };

    const uniqueOrgIds = new Set(Object.values(resolvedOrgIds).filter(Boolean));

    const isConsistent = uniqueOrgIds.size <= 1;

    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      ok: !!clerkUserId && activeOrgSafe.ok,
      timestamp: new Date().toISOString(),
      latencyMs: elapsed,

      // Layer 1: Clerk
      clerk: {
        authenticated: !!clerkUserId,
        userId: clerkUserId || null,
        orgId: clerkOrgId || null,
        email: clerkUser?.emailAddresses?.[0]?.emailAddress || null,
        firstName: clerkUser?.firstName || null,
        lastName: clerkUser?.lastName || null,
        publicMetadata: sessionClaims?.publicMetadata || null,
      },

      // Layer 2: Our resolvers
      resolvers: {
        activeOrgSafe: activeOrgSafe.ok
          ? { ok: true, orgId: activeOrgSafe.org.id, source: activeOrgSafe.source }
          : { ok: false, reason: activeOrgSafe.reason, error: activeOrgSafe.error },
        getTenant:
          typeof tenantResult === "string"
            ? { ok: true, orgId: tenantResult }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            : { ok: false, error: (tenantResult as any)?.error },
        getOrg: getOrgResult.ok
          ? { ok: true, orgId: getOrgResult.orgId }
          : { ok: false, reason: getOrgResult.reason },
        isConsistent,
        resolvedOrgIds,
      },

      // Layer 3: Database
      db: dbState,

      // Layer 4: Claim test (if requested)
      claimTest,

      // Diagnostic summary
      diagnosis: generateDiagnosis(!!clerkUserId, activeOrgSafe, dbState, isConsistent, claimTest),
    });
  } catch (error) {
    logger.error("[__TRUTH] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Truth check failed",
        detail: error instanceof Error ? error.message : String(error),
        stack:
          // eslint-disable-next-line no-restricted-syntax
          process.env.NODE_ENV !== "production"
            ? error instanceof Error
              ? error.stack
              : undefined
            : undefined,
      },
      { status: 500 }
    );
  }
}

function generateDiagnosis(
  isAuthenticated: boolean,
  orgResult: Awaited<ReturnType<typeof getActiveOrgSafe>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbState: any,
  isConsistent: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  claimTest: any
): { status: string; issues: string[]; recommendations: string[] } {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check authentication
  if (!isAuthenticated) {
    issues.push("NOT_AUTHENTICATED");
    recommendations.push("Sign in at /sign-in");
    return { status: "UNAUTHENTICATED", issues, recommendations };
  }

  // Check org resolution
  if (!orgResult.ok) {
    issues.push(`ORG_RESOLUTION_FAILED: ${orgResult.reason}`);

    if (orgResult.reason === "NO_SESSION") {
      recommendations.push("Session may have expired. Sign out and sign back in.");
    } else if (orgResult.reason === "CREATE_FAILED") {
      recommendations.push("Check for pending team invitations at /invitations");
    } else {
      recommendations.push("Contact support — organization membership is broken");
    }
  }

  // Check database state
  if (dbState) {
    if (!dbState.user) {
      issues.push("NO_DB_USER_RECORD");
      recommendations.push("User record missing in database. Try signing out and back in.");
    }

    if (dbState.memberships.length === 0) {
      issues.push("NO_MEMBERSHIPS");
      recommendations.push("Complete onboarding at /onboarding/wizard");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orphaned = dbState.memberships.filter((m: any) => m.isOrphaned);
    if (orphaned.length > 0) {
      issues.push(`ORPHANED_MEMBERSHIPS: ${orphaned.length}`);
      recommendations.push("Orphaned memberships detected — contact support for cleanup");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (dbState.claimCounts.every((c: any) => c.count === 0)) {
      issues.push("NO_CLAIMS_IN_ANY_ORG");
      recommendations.push("Create your first claim at /claims/new");
    }
  }

  // Check resolver consistency
  if (!isConsistent) {
    issues.push("RESOLVER_INCONSISTENCY");
    recommendations.push("Different auth functions returning different orgs — this is a bug");
  }

  // Check claim test
  if (claimTest) {
    if (!claimTest.found) {
      issues.push("CLAIM_NOT_IN_DATABASE");
      recommendations.push(`Claim ${claimTest.testId} does not exist. It may have been deleted.`);
    } else if (!claimTest.accessible) {
      issues.push("CLAIM_ORG_MISMATCH");
      recommendations.push(
        `Claim belongs to a different organization. You may need to switch orgs.`
      );
    }
  }

  if (issues.length === 0) {
    return { status: "HEALTHY", issues: [], recommendations: [] };
  }

  return {
    status: issues.length > 2 ? "CRITICAL" : "DEGRADED",
    issues,
    recommendations,
  };
}
