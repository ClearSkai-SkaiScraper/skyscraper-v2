export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { notifyConnectionDeclined } from "@/lib/services/tradesNotifications";

const declineSchema = z.object({
  connectionId: z.string(),
});

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validation = declineSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { connectionId } = validation.data;

    // Verify the caller is a member of the contractor company
    const member = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: { companyId: true },
    });

    if (!member?.companyId) {
      return NextResponse.json(
        { ok: false, error: "You are not associated with a trades company" },
        { status: 403 }
      );
    }

    const connection = await prisma.clientProConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return NextResponse.json({ ok: false, error: "Connection not found" }, { status: 404 });
    }

    if (connection.contractorId !== member.companyId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.clientProConnection.update({
      where: { id: connectionId },
      data: { status: "declined" },
    });

    // Send notification to client
    try {
      const client = await prisma.client.findUnique({
        where: { id: connection.clientId },
        select: { userId: true },
      });
      const company = await prisma.tradesCompany.findUnique({
        where: { id: member.companyId },
        select: { name: true },
      });
      if (client?.userId && company) {
        await notifyConnectionDeclined({
          clientClerkId: client.userId,
          proCompanyName: company.name,
          connectionId,
        });
      }
    } catch (notifErr) {
      logger.error("[connections/decline] Notification error:", notifErr);
    }

    return NextResponse.json({ ok: true, connection: updated });
  } catch (error) {
    logger.error("POST /api/connections/decline error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
