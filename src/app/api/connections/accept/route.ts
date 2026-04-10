export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { generateContactSlug } from "@/lib/generateContactSlug";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { notifyConnectionAccepted } from "@/lib/services/tradesNotifications";

const acceptSchema = z.object({
  connectionId: z.string(),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const validation = acceptSchema.safeParse(body);

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
      data: {
        status: "accepted",
        connectedAt: new Date(),
      },
    });

    // ── Auto-create a Contact card for this client in the pro's org ──
    try {
      const clientRecord = await prisma.client.findUnique({
        where: { id: connection.clientId },
        select: { id: true, name: true, email: true, phone: true, userId: true },
      });

      if (clientRecord) {
        // Get the pro's orgId from their user record
        const proUser = await prisma.users.findFirst({
          where: { clerkUserId: userId },
          select: { orgId: true },
        });

        if (proUser?.orgId) {
          // Check if a contact already exists for this email/client
          const existingContact = clientRecord.email
            ? await prisma.contacts.findFirst({
                where: { orgId: proUser.orgId, email: clientRecord.email },
              })
            : null;

          if (!existingContact) {
            const nameParts = (clientRecord.name || "Client").split(" ");
            await prisma.contacts.create({
              data: {
                id: crypto.randomUUID(),
                orgId: proUser.orgId,
                firstName: nameParts[0] || "Client",
                lastName: nameParts.slice(1).join(" ") || "",
                slug: generateContactSlug(
                  nameParts[0] || "Client",
                  nameParts.slice(1).join(" ") || ""
                ),
                email: clientRecord.email || null,
                phone: clientRecord.phone || null,
                source: "portal_connection",
                tags: ["client", "portal"],
                updatedAt: new Date(),
              },
            });
            logger.info(
              `[connections/accept] Created contact card for client ${clientRecord.id} in org ${proUser.orgId}`
            );
          }
        }
      }
    } catch (contactErr) {
      // Don't fail the connection acceptance if contact creation fails
      logger.error("[connections/accept] Contact creation error:", contactErr);
    }

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
        await notifyConnectionAccepted({
          clientClerkId: client.userId,
          proCompanyName: company.name,
          connectionId,
          proClerkId: userId,
        });
      }
    } catch (notifErr) {
      logger.error("[connections/accept] Notification error:", notifErr);
    }

    return NextResponse.json({ ok: true, connection: updated });
  } catch (error) {
    logger.error("POST /api/connections/accept error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
