export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/company/connections - List all client connections for the pro's company
 *
 * Returns connected clients from both:
 * 1. ClientProConnection (portal invite system)
 * 2. Legacy Client records linked to the org
 *
 * Used by ClientConnectSection to populate the "Select from Your Network" dropdown
 */

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export async function GET(req: Request) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId, orgId } = ctx;

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Resolve tradesCompanyMember for ClientProConnection queries
    const membership = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: { companyId: true, orgId: true },
    });

    if (!orgId) {
      return NextResponse.json({ connections: [] });
    }

    // ── Collect connections from multiple sources ──
    const connections: Array<{
      id: string;
      name: string;
      firstName?: string | null;
      lastName?: string | null;
      email: string | null;
      phone: string | null;
      companyName?: string | null;
      contactId: string;
    }> = [];

    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();

    // ── Source 1: ClientProConnection (client portal connections) ──
    if (membership?.companyId) {
      const proConnections = await prisma.clientProConnection.findMany({
        where: {
          contractorId: membership.companyId,
          status: {
            in: ["connected", "ACCEPTED", "accepted", "pending"],
          },
        },
        include: {
          Client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { invitedAt: "desc" },
        take: limit,
      });

      for (const pc of proConnections) {
        if (!pc.Client) continue;
        const client = pc.Client;
        const clientName =
          client.name ||
          `${client.firstName || ""} ${client.lastName || ""}`.trim() ||
          "Unknown Client";

        if (!seenIds.has(client.id)) {
          seenIds.add(client.id);
          if (client.email) seenEmails.add(client.email.toLowerCase());

          connections.push({
            id: pc.id, // connection ID
            name: clientName,
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            phone: client.phone,
            contactId: client.id, // client ID for attaching to claims
          });
        }
      }
    }

    // Only return Client Network connections (ClientProConnection).
    // Legacy Client records and CRM Contacts are NOT included — the user
    // wants to see only clients they've explicitly connected with.

    logger.info("[GET /api/company/connections]", {
      userId,
      orgId,
      count: connections.length,
    });

    return NextResponse.json({ connections });
  } catch (error) {
    logger.error("[GET /api/company/connections] Error:", error);
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
  }
}
