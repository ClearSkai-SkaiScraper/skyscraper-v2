/* eslint-disable no-restricted-imports, @typescript-eslint/await-thenable */
/**
 * API Route Authentication Helpers
 * Returns NextResponse errors instead of redirects (unlike page guards)
 */

/* eslint-disable no-restricted-imports */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface ApiAuthResult {
  userId: string;
  orgId: string | null;
  user: {
    id: string;
    clerkUserId: string;
    email: string;
    name: string | null;
  };
}

/**
 * Require authentication for API routes (org is optional for fallback scenarios)
 * Returns 401 if not authenticated
 * OrgId may be null - calling code should handle gracefully
 */
export async function requireApiAuth(): Promise<ApiAuthResult | NextResponse> {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.users.findFirst({
      where: { clerkUserId: userId },
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found in database." }, { status: 403 });
    }

    return {
      userId,
      orgId: orgId || null,
      user,
    };
  } catch (error) {
    logger.error("[requireApiAuth] Error:", error);
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Require authentication AND resolve organization context for API routes.
 * Uses unified resolver to attach DB orgId even when Clerk orgId is missing.
 * Returns 401 if not authenticated, 500 on unexpected resolver errors.
 */
export async function requireApiOrg(): Promise<ApiAuthResult | NextResponse> {
  try {
    const base = await requireApiAuth();
    if (base instanceof NextResponse) return base;

    // Resolve org via unified resolver (auto-create or demo fallback handled elsewhere)
    const { getActiveOrgContext } = await import("@/lib/org/getActiveOrgContext");
    const ctx = await getActiveOrgContext({ required: true });

    if (!ctx.ok) {
      return NextResponse.json(
        { error: `Organization context unavailable: ${ctx.reason}` },
        { status: ctx.reason === "unauthenticated" ? 401 : 400 }
      );
    }

    // Map to ApiAuthResult shape
    return {
      userId: base.userId,
      orgId: ctx.orgId,
      user: base.user,
    };
  } catch (error) {
    logger.error("[requireApiOrg] Error:", error);
    return NextResponse.json({ error: "Failed to resolve organization context." }, { status: 500 });
  }
}

/**
 * Verify claim belongs to org OR user (for use after requireApiAuth)
 * Allows both org-level and user-level access
 */
export async function verifyClaimAccess(
  claimId: string,
  orgId: string | null | undefined,
  userId: string
): Promise<{ ok: true } | NextResponse> {
  try {
    // Try org-level access first if orgId is available
    if (orgId) {
      const claim = await prisma.claims.findFirst({
        where: {
          id: claimId,
          orgId,
        },
        select: {
          id: true,
          orgId: true,
        },
      });

      if (claim) {
        return { ok: true };
      }
    }

    // Fall back to user-level access (for users without org or personal claims)
    const claim = await prisma.claims.findFirst({
      where: {
        id: claimId,
        assignedTo: userId,
      },
      select: {
        id: true,
        orgId: true,
        assignedTo: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found or access denied." }, { status: 404 });
    }

    return { ok: true };
  } catch (error) {
    logger.error("[verifyClaimAccess] Error:", error);
    return NextResponse.json({ error: "Failed to verify claim access." }, { status: 500 });
  }
}
