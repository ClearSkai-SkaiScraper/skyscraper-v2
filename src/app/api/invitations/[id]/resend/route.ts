export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * POST /api/invitations/:id/resend
 * Resend a client invitation by resetting its status to pending
 */
export const POST = withAuth(async (req: NextRequest, { userId }, routeParams) => {
  try {
    const { id: invitationId } = await routeParams.params;

    // Verify this invitation belongs to the requesting pro's company
    const member = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: { companyId: true },
    });

    if (!member?.companyId) {
      return NextResponse.json({ error: "No company profile" }, { status: 400 });
    }

    const connection = await prisma.clientProConnection.findFirst({
      where: {
        id: invitationId,
        contractorId: member.companyId,
      },
      include: { Client: { select: { email: true, name: true } } },
    });

    if (!connection) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Reset to pending
    const updated = await prisma.clientProConnection.update({
      where: { id: invitationId },
      data: {
        status: "pending",
        invitedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: updated.id,
        status: updated.status,
        clientEmail: connection.Client?.email,
        resentAt: updated.invitedAt,
      },
    });
  } catch (error: unknown) {
    logger.error("[POST /api/invitations/:id/resend] Error:", error);
    return NextResponse.json({ error: "Failed to resend invitation" }, { status: 500 });
  }
});
