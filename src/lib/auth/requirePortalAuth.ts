/**
 * ============================================================================
 * requirePortalAuth — Portal API Route Guard
 * ============================================================================
 *
 * Single entry point for ALL portal API routes that need client authentication.
 *
 * GUARANTEES:
 *   1. User is authenticated via Clerk
 *   2. User has a valid email in the users table
 *   3. Returns userId + email for query scoping
 *   4. Optional claim access verification
 *
 * USAGE:
 *
 *   // Basic portal auth (userId + email):
 *   const ctx = await requirePortalAuth();
 *   if (ctx instanceof NextResponse) return ctx;
 *   const { userId, email } = ctx;
 *
 *   // With claim access check:
 *   const ctx = await requirePortalAuth({ claimId });
 *   if (ctx instanceof NextResponse) return ctx;
 *   const { userId, email, orgId, claim } = ctx;
 *
 * ============================================================================
 */

/* eslint-disable no-restricted-imports */
import "server-only";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface PortalAuthResult {
  userId: string;
  email: string;
  orgId?: string;
  claim?: {
    id: string;
    orgId: string;
    claimNumber: string | null;
    title: string | null;
    status: string | null;
  };
}

export type PortalAuthResponse = PortalAuthResult | NextResponse;

export interface RequirePortalAuthOptions {
  /** If provided, verify the user has portal access to this specific claim */
  claimId?: string;
}

/**
 * Require portal authentication for a client-facing API route.
 *
 * Returns either the resolved context or a NextResponse error.
 * Callers should check: `if (result instanceof NextResponse) return result;`
 */
export async function requirePortalAuth(
  options?: RequirePortalAuthOptions
): Promise<PortalAuthResponse> {
  try {
    // Step 1: Verify Clerk authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "UNAUTHENTICATED", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Step 2: Resolve user email from DB
    const user = await prisma.users.findFirst({
      where: { clerkUserId: userId },
      select: { email: true },
    });

    if (!user?.email) {
      // Fallback: check client table directly
      const client = await prisma.client.findFirst({
        where: { userId },
        select: { email: true },
      });

      if (!client?.email) {
        return NextResponse.json(
          { error: "NO_PROFILE", message: "User profile not found" },
          { status: 403 }
        );
      }

      // If we only need basic auth, return here
      if (!options?.claimId) {
        return { userId, email: client.email };
      }

      // Step 3: Verify claim access
      return verifyClaimAccess(userId, client.email, options.claimId);
    }

    // If we only need basic auth, return here
    if (!options?.claimId) {
      return { userId, email: user.email };
    }

    // Step 3: Verify claim access
    return verifyClaimAccess(userId, user.email, options.claimId);
  } catch (err) {
    logger.error("[requirePortalAuth] Unexpected error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Portal authentication check failed" },
      { status: 500 }
    );
  }
}

/**
 * Verify a user has access to a specific claim via the client_access table
 */
async function verifyClaimAccess(
  userId: string,
  email: string,
  claimId: string
): Promise<PortalAuthResponse> {
  const access = await prisma.client_access.findFirst({
    where: { email, claimId },
  });

  if (!access) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "No access to this claim" },
      { status: 403 }
    );
  }

  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      orgId: true,
      claimNumber: true,
      title: true,
      status: true,
    },
  });

  if (!claim) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Claim not found" }, { status: 404 });
  }

  return {
    userId,
    email,
    orgId: claim.orgId,
    claim,
  };
}

/**
 * Helper to check if requirePortalAuth returned an error response.
 */
export function isPortalAuthError(result: PortalAuthResponse): result is NextResponse {
  return result instanceof NextResponse;
}
