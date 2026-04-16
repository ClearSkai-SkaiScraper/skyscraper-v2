/**
 * GET /api/portal/claims/[claimId]/events
 *
 * Returns timeline events for a claim in the client portal.
 * Uses claim_activities table.
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

    // Verify access
    const hasAccess = await verifyClaimAccess(claimId, userId, email);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch timeline events
    const events = await prisma.claim_activities
      .findMany({
        where: { claim_id: claimId },
        orderBy: { created_at: "desc" },
        take: 50,
        select: {
          id: true,
          type: true,
          message: true,
          created_at: true,
        },
      })
      .catch(() => []);

    const formattedEvents = events.map((e) => ({
      id: e.id,
      title: e.type,
      description: e.message,
      eventType: e.type,
      createdAt: e.created_at,
    }));

    return NextResponse.json({ ok: true, events: formattedEvents });
  } catch (error) {
    logger.error("[PORTAL_CLAIM_EVENTS]", error);
    return NextResponse.json({ ok: true, events: [] });
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
