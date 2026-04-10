export const dynamic = "force-dynamic";

/**
 * POST /api/invitations/send
 * Send client invitations from a pro — creates ClientProConnection + Client records
 * Supports single and bulk invitations
 */

import { NextRequest, NextResponse } from "next/server";

import { logCriticalAction } from "@/lib/audit/criticalActions";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (request: NextRequest, { userId, orgId }) => {
  try {
    const body = await request.json();
    const { type, email, emails, firstName, lastName, message } = body;

    // Get the pro's company
    const member = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: { id: true, companyId: true, companyName: true, firstName: true, lastName: true },
    });

    if (!member?.companyId) {
      return NextResponse.json(
        { error: "You need a company profile to send invitations" },
        { status: 400 }
      );
    }

    const emailList: Array<{ email: string; firstName?: string; lastName?: string }> =
      type === "bulk"
        ? (emails || []).map((e: string) => ({ email: e }))
        : [{ email, firstName, lastName }];

    const results: Array<{ email: string; status: string; error?: string }> = [];

    for (const invitee of emailList) {
      try {
        if (!invitee.email) {
          results.push({ email: "", status: "skipped", error: "No email" });
          continue;
        }

        // Check if client already exists
        let client = await prisma.client.findFirst({
          where: { email: invitee.email },
        });

        // Create client record if doesn't exist
        if (!client) {
          const slug = invitee.email.split("@")[0] + "-" + Date.now().toString(36);
          client = await prisma.client.create({
            data: {
              id: crypto.randomUUID(),
              slug,
              email: invitee.email,
              name:
                invitee.firstName && invitee.lastName
                  ? `${invitee.firstName} ${invitee.lastName}`
                  : invitee.firstName || null,
              firstName: invitee.firstName || null,
              lastName: invitee.lastName || null,
              orgId,
            },
          });
        }

        // Check if connection already exists
        const existing = await prisma.clientProConnection.findFirst({
          where: {
            clientId: client.id,
            contractorId: member.companyId,
          },
        });

        if (existing) {
          results.push({ email: invitee.email, status: "already_connected" });
          continue;
        }

        // Create the connection invitation
        await prisma.clientProConnection.create({
          data: {
            id: crypto.randomUUID(),
            clientId: client.id,
            contractorId: member.companyId,
            status: "pending",
            invitedBy: userId,
            notes: message || "Invited via network invitations",
          },
        });

        results.push({ email: invitee.email, status: "sent" });
      } catch (_err) {
        results.push({ email: invitee.email, status: "error", error: "Internal server error" });
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const alreadyConnected = results.filter((r) => r.status === "already_connected").length;

    // Audit log invitation sends
    if (sent > 0) {
      await logCriticalAction("INVITE_SENT", userId, member.companyId, {
        inviteCount: sent,
        alreadyConnected,
        total: results.length,
      });
    }

    return NextResponse.json({
      success: true,
      sent,
      alreadyConnected,
      total: results.length,
      results,
    });
  } catch (error) {
    logger.error("[POST /api/invitations/send] Error:", error);
    return NextResponse.json({ error: "Failed to send invitations" }, { status: 500 });
  }
});
