/**
 * GET /api/portal/claims/[claimId]/access
 *
 * Returns the client's access role for this claim.
 * Used by the portal claim detail page to determine if uploads are allowed.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { isPortalAuthError, requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ claimId: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const authResult = await requirePortalAuth();
    if (isPortalAuthError(authResult)) return authResult;
    const { userId, email } = authResult;

    const { claimId } = await context.params;

    // Verify access via all paths
    const hasAccess = await verifyClaimAccess(claimId, userId, email);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Default role: clients can view and upload (EDITOR)
    // In the future this could be determined by the ClaimClientLink role
    return NextResponse.json({
      ok: true,
      role: "EDITOR",
      canUpload: true,
      canMessage: true,
    });
  } catch (error) {
    logger.error("[PORTAL_CLAIM_ACCESS]", error);
    return NextResponse.json({ ok: true, role: "VIEWER", canUpload: false, canMessage: true });
  }
}

async function verifyClaimAccess(
  claimId: string,
  userId: string,
  email: string | null
): Promise<boolean> {
  if (email) {
    const access = await prisma.client_access.findFirst({
      where: { claimId, email },
    });
    if (access) return true;
  }

  const client = await prisma.client.findFirst({
    where: { OR: [{ userId }, ...(email ? [{ email }] : [])] },
    select: { id: true },
  });

  if (client) {
    const link = await prisma.claimClientLink.findFirst({
      where: {
        claimId,
        OR: [{ clientUserId: client.id }, ...(email ? [{ clientEmail: email }] : [])],
        status: { in: ["accepted", "connected", "pending"] },
      },
    });
    if (link) return true;

    const claimByClientId = await prisma.claims.findFirst({
      where: { id: claimId, clientId: client.id },
      select: { id: true },
    });
    if (claimByClientId) return true;
  }

  return false;
}
