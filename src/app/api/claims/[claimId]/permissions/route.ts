import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { getClaimPermissions } from "@/lib/auth/permissions";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/claims/[claimId]/permissions
 * Returns all permissions for the current user on a specific claim
 * Used by UI to show/hide action buttons and enforce access control
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId, userId } = auth;

    const { claimId } = await params;

    // Verify claim belongs to this org
    await getOrgClaimOrThrow(orgId, claimId);

    const permissions = await getClaimPermissions({ userId, claimId });

    return NextResponse.json({
      success: true,
      permissions,
    });
  } catch (error) {
    if (error instanceof OrgScopeError) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    logger.error("[permissions] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}
