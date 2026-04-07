export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/invitations
 * List all client invitations (ClientProConnection records) sent by the current pro's company
 */
export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    // Get the pro's company
    const member = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: { companyId: true },
    });

    if (!member?.companyId) {
      return NextResponse.json({ invitations: [] });
    }

    // Query ClientProConnection records for this company
    // Scoped by member.companyId (derived from userId) — no cross-tenant risk
    const connections = await prisma.clientProConnection.findMany({
      where: { contractorId: member.companyId },
      include: {
        Client: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { invitedAt: "desc" },
    });

    // Map to the expected invitation format
    const invitations = connections.map((conn) => ({
      id: conn.id,
      email: conn.Client?.email || "Unknown",
      firstName: conn.Client?.firstName || conn.Client?.name?.split(" ")[0] || "Client",
      lastName: conn.Client?.lastName || conn.Client?.name?.split(" ").slice(1).join(" ") || "",
      message: conn.notes || "",
      status: conn.status,
      createdAt: conn.invitedAt.toISOString(),
      sentAt: conn.invitedAt.toISOString(),
      viewedAt: null,
      acceptedAt: conn.connectedAt?.toISOString() || null,
      clientId: conn.clientId,
      avatarUrl: conn.Client?.avatarUrl || null,
    }));

    return NextResponse.json({ invitations });
  } catch (error: unknown) {
    logger.error("Error fetching invitations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
