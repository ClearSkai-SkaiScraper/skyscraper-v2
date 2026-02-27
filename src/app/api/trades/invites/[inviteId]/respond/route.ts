/**
 * POST /api/trades/invites/[inviteId]/respond
 * Accept or decline a ClientProConnection invitation.
 * Body: { accept: boolean }
 *
 * Called by WorkOpportunityNotifications widget.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const respondSchema = z.object({
  accept: z.boolean(),
});

export const POST = withAuth(
  async (req: NextRequest, { userId }, { params }: { params: Promise<{ inviteId: string }> }) => {
    try {
      const { inviteId } = await params;

      const body = await req.json();
      const validation = respondSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
      }

      const { accept } = validation.data;

      // Verify the caller is a member of the contractor company
      const member = await prisma.tradesCompanyMember.findUnique({
        where: { userId },
        select: { companyId: true },
      });

      if (!member?.companyId) {
        return NextResponse.json(
          { ok: false, error: "Not a trades company member" },
          { status: 403 }
        );
      }

      const connection = await prisma.clientProConnection.findUnique({
        where: { id: inviteId },
      });

      if (!connection) {
        return NextResponse.json({ ok: false, error: "Invite not found" }, { status: 404 });
      }

      if (connection.contractorId !== member.companyId) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }

      const updated = await prisma.clientProConnection.update({
        where: { id: inviteId },
        data: {
          status: accept ? "accepted" : "declined",
          connectedAt: accept ? new Date() : undefined,
        },
      });

      // Create notification for the client
      try {
        const client = await prisma.client.findUnique({
          where: { id: connection.clientId },
          select: { userId: true },
        });

        if (client?.userId) {
          await prisma.clientNotification.create({
            data: {
              clientId: connection.clientId,
              type: accept ? "connection_accepted" : "connection_declined",
              title: accept
                ? "Your connection request was accepted!"
                : "Connection request declined",
              message: accept
                ? "You can now message this contractor directly."
                : "The contractor has declined your connection request.",
              actionUrl: accept ? "/portal/my-pros" : "/portal/find-a-pro",
            },
          });
        }
      } catch (notifErr) {
        logger.warn("[trades/invites/respond] Notification error:", notifErr);
      }

      return NextResponse.json({ ok: true, connection: updated });
    } catch (error) {
      logger.error("[POST /api/trades/invites/respond]", error);
      return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
    }
  }
);
