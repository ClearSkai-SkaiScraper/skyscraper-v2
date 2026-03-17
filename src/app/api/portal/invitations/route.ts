/**
 * Portal Invitations API
 * Handles fetching invitations from pros to clients (homeowners)
 */

import { NextResponse } from "next/server";

import { isPortalAuthError, requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/portal/invitations - List pending invitations for current client
 */
export async function GET() {
  try {
    const authResult = await requirePortalAuth();
    if (isPortalAuthError(authResult)) return authResult;
    const { userId } = authResult;

    // Rate limit portal requests
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

    // Get the client record for this user
    const client = await prisma.client.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!client) {
      // User is not a client, return empty
      return NextResponse.json({ invitations: [] });
    }

    // Get pending invitations for this client
    const connections = await prisma.clientConnection.findMany({
      where: {
        clientId: client.id,
        status: "pending",
      },
      orderBy: { invitedAt: "desc" },
    });

    // Fetch organization details for each invitation
    const orgIds = connections.map((c) => c.orgId);
    const orgs = await prisma.org.findMany({
      where: { id: { in: orgIds } },
      select: {
        id: true,
        name: true,
        brandLogoUrl: true,
      },
    });

    // Get inviter details
    const inviterIds = connections.map((c) => c.invitedBy);
    const inviters = await prisma.users.findMany({
      where: { clerkUserId: { in: inviterIds } },
      select: {
        clerkUserId: true,
        name: true,
      },
    });

    const orgMap = new Map(orgs.map((o) => [o.id, o]));
    const inviterMap = new Map(inviters.map((i) => [i.clerkUserId, i]));

    const invitations = connections.map((c) => {
      const org = orgMap.get(c.orgId);
      const inviter = inviterMap.get(c.invitedBy);
      return {
        id: c.id,
        companyName: org?.name || "Unknown Company",
        companyLogo: org?.brandLogoUrl || null,
        trade: "General Contractor",
        invitedBy: inviter?.name || "Team Member",
        createdAt: c.invitedAt.toISOString(),
      };
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    logger.error("[portal/invitations] Failed to fetch:", error);
    return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
  }
}
