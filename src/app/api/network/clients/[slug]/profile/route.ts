import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/network/clients/[slug]/profile
 * Get client profile for pro view in leads/network
 * Allows pros to view their connected client's profile
 */
export const GET = withAuth(async (req: NextRequest, { orgId }, routeParams) => {
  try {
    const { slug: clientId } = await routeParams.params;

    // Get client from various sources
    // 1. Check contacts table (CRM contacts)
    const contact = await prisma.contacts.findFirst({
      where: {
        OR: [{ id: clientId }, { slug: clientId }],
        orgId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        street: true,
        city: true,
        state: true,
        zipCode: true,
        company: true,
        title: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (contact) {
      return NextResponse.json({
        profile: {
          id: contact.id,
          type: "contact",
          name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Client",
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          location: {
            address: contact.street,
            city: contact.city,
            state: contact.state,
            zip: contact.zipCode,
          },
          company: contact.company,
          role: contact.title,
          notes: contact.notes,
          claims: [],
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt,
        },
      });
    }

    // 2. Check connections (trades network) - uses lowercase tradesConnection model with status
    const connection = await prisma.tradesConnection.findFirst({
      where: {
        OR: [{ requesterId: clientId }, { addresseeId: clientId }],
        status: "accepted",
      },
      select: {
        id: true,
        requesterId: true,
        addresseeId: true,
        createdAt: true,
      },
    });

    if (connection) {
      // Get user info from users table
      const user = await prisma.users.findFirst({
        where: {
          OR: [{ id: clientId }, { clerkUserId: clientId }],
        },
        select: {
          id: true,
          name: true,
          email: true,
          headshot_url: true,
          createdAt: true,
        },
      });

      if (user) {
        return NextResponse.json({
          profile: {
            id: user.id,
            type: "connection",
            name: user.name || "Connected User",
            email: user.email,
            phone: null,
            avatar: user.headshot_url,
            connectionId: connection.id,
            connectedAt: connection.createdAt,
            createdAt: user.createdAt,
          },
        });
      }
    }

    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  } catch (error) {
    logger.error("[GET /api/network/clients/[slug]/profile] Error:", error);
    return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
  }
});
