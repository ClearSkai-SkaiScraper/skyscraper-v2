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
    const membership = await prisma.tradesCompanyMember.findUnique({
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

    // ── Source 2: Legacy Client records linked to this org ──
    const orgClients = await prisma.client.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    for (const client of orgClients) {
      // Deduplicate by ID and email
      if (seenIds.has(client.id)) continue;
      if (client.email && seenEmails.has(client.email.toLowerCase())) continue;

      seenIds.add(client.id);
      if (client.email) seenEmails.add(client.email.toLowerCase());

      const clientName =
        client.name ||
        `${client.firstName || ""} ${client.lastName || ""}`.trim() ||
        "Unknown Client";

      connections.push({
        id: client.id,
        name: clientName,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        contactId: client.id,
      });
    }

    // ── Source 3: CRM Contacts (Contacts table) ──
    const contacts = await prisma.contacts.findMany({
      where: { orgId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    for (const contact of contacts) {
      if (seenIds.has(contact.id)) continue;
      if (contact.email && seenEmails.has(contact.email.toLowerCase())) continue;

      seenIds.add(contact.id);
      if (contact.email) seenEmails.add(contact.email.toLowerCase());

      const contactName =
        `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Unknown Contact";

      connections.push({
        id: contact.id,
        name: contactName,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        contactId: contact.id,
      });
    }

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
