import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Prisma singleton imported from @/lib/db/prisma

/**
 * GET /api/trades/membership
 *
 * Returns the current user's Full Access membership status
 */
export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    // Check Full Access status
    const hasFullAccess = await prisma.$queryRaw<Array<{ has_access: boolean }>>`
      SELECT has_full_access(${userId}::uuid) as has_access
    `;

    // Get membership details
    const membership = await prisma.$queryRaw<
      Array<{
        full_access: boolean;
        expires_at: string | null;
        stripe_subscription_id: string | null;
      }>
    >`
      SELECT full_access, expires_at, stripe_subscription_id
      FROM tn_memberships
      WHERE user_id = ${userId}::uuid
    `;

    const membershipData = membership && membership.length > 0 ? membership[0] : null;

    return NextResponse.json({
      ok: true,
      hasFullAccess: hasFullAccess[0]?.has_access || false,
      expiresAt: membershipData?.expires_at || null,
      stripeSubscriptionId: membershipData?.stripe_subscription_id || null,
    });
  } catch (err: unknown) {
    logger.error("GET /api/trades/membership error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
