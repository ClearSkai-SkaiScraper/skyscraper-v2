/**
 * GET /api/connections/received
 * Returns pending ClientProConnection requests where the authenticated user's
 * tradesCompany is the contractor (i.e., incoming connection requests from clients).
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    // Find the tradesCompanyMember record for this user
    const member = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: { id: true, companyId: true },
    });

    if (!member?.companyId) {
      // User is not a trades company member — no received connections possible
      return NextResponse.json({ received: [] });
    }

    // Find all ClientProConnection rows targeting this company
    // Scoped by member.companyId (derived from userId) — no cross-tenant risk
    const connections = await prisma.clientProConnection.findMany({
      where: { contractorId: member.companyId },
      include: {
        Client: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            city: true,
            state: true,
            category: true,
          },
        },
      },
      orderBy: { invitedAt: "desc" },
    });

    const received = connections.map((c) => ({
      id: c.id,
      status: c.status,
      notes: c.notes,
      invitedAt: c.invitedAt.toISOString(),
      connectedAt: c.connectedAt?.toISOString() ?? null,
      client: {
        id: c.Client.id,
        name:
          [c.Client.firstName, c.Client.lastName].filter(Boolean).join(" ") ||
          c.Client.name ||
          c.Client.email ||
          "Unknown Client",
        email: c.Client.email,
        phone: c.Client.phone,
        avatarUrl: c.Client.avatarUrl,
        city: c.Client.city,
        state: c.Client.state,
        category: c.Client.category,
      },
    }));

    return NextResponse.json({ received });
  } catch (error) {
    logger.error("[GET /api/connections/received]", error);
    return NextResponse.json({ error: "Failed to load received connections" }, { status: 500 });
  }
});
