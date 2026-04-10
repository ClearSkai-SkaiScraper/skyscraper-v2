export const dynamic = "force-dynamic";

// ORG-SCOPE: Scoped by userId/clientId — all queries filter by client.id (derived from auth userId). No cross-tenant risk.
/**
 * Connections API - Client Portal
 * Manages connection requests from clients to contractors
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { notifyConnectionRequest } from "@/lib/services/tradesNotifications";

/**
 * POST - Create a connection request from client to a pro
 */
export async function POST(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connectionSchema = z.object({
      proId: z.string().min(1, "Pro ID is required"),
    });

    const body = await req.json();
    const parsed = connectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const { proId } = parsed.data;

    // proId might be a tradesCompanyMember.id or tradesCompany.id
    // First try to find the tradesCompanyMember, then get their company
    let companyId = proId;

    // Check if this is a member ID
    const member = await prisma.tradesCompanyMember.findFirst({
      where: { id: proId },
      select: { id: true, userId: true, companyId: true, companyName: true },
    });

    if (member) {
      // If member has a company, use company ID; otherwise create/find company by member
      if (member.companyId) {
        companyId = member.companyId;
      } else {
        // Member doesn't have a company - check if company exists by userId, name, or ID
        // First: check if another member record for same userId already has a company
        let company = member.userId
          ? await prisma.tradesCompanyMember
              .findFirst({
                where: {
                  userId: member.userId,
                  companyId: { not: null },
                  id: { not: member.id },
                },
                select: { company: true },
              })
              .then((m) => m?.company || null)
              .catch(() => null)
          : null;

        // Second: try by proId or company name (case-insensitive)
        if (!company) {
          company = await prisma.tradesCompany.findFirst({
            where: {
              OR: [
                { id: proId },
                member.companyName
                  ? { name: { equals: member.companyName, mode: "insensitive" } }
                  : {},
              ],
            },
          });
        }

        if (!company && member.companyName) {
          // Create a company for this member (tradesCompany uses isActive not isPublic)
          company = await prisma.tradesCompany.create({
            data: {
              name: member.companyName,
              slug: `company-${member.id.slice(-8)}`,
              isActive: true,
            },
          });
        }

        if (company) {
          // Link member to company
          await prisma.tradesCompanyMember.update({
            where: { id: member.id },
            data: { companyId: company.id },
          });
          companyId = company.id;
        }
      }
    }

    // Verify the company exists
    const company = await prisma.tradesCompany.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    // Get or create the client profile
    const email = user.emailAddresses?.[0]?.emailAddress;
    let client = await prisma.client.findFirst({
      where: {
        OR: [{ userId }, { email }],
      },
    });

    // If no client profile exists, create one
    if (!client) {
      const slug = `client-${userId.slice(-8)}-${Date.now()}`;
      client = await prisma.client.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          slug,
          email: email || null,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Client",
          status: "active",
        },
      });
    }

    // Check if connection already exists
    const existingConnection = await prisma.clientProConnection.findFirst({
      where: {
        clientId: client.id,
        contractorId: companyId,
      },
    });

    if (existingConnection) {
      return NextResponse.json({
        success: true,
        connection: existingConnection,
        message:
          existingConnection.status?.toLowerCase() === "accepted"
            ? "Already connected"
            : "Connection request pending",
      });
    }

    // Create the connection request (ClientProConnection doesn't have connectionSource or requestedAt)
    const connection = await prisma.clientProConnection.create({
      data: {
        id: crypto.randomUUID(),
        clientId: client.id,
        contractorId: companyId,
        status: "pending",
        notes: "Source: profile_view",
        invitedAt: new Date(),
      },
    });

    // Send notification to contractor team
    try {
      const companyMembers = await prisma.tradesCompanyMember.findMany({
        where: { companyId },
        select: { userId: true },
      });
      const clientName =
        [client.firstName, client.lastName].filter(Boolean).join(" ") || client.name || "A client";
      for (const m of companyMembers) {
        if (m.userId) {
          await notifyConnectionRequest({
            proClerkId: m.userId,
            clientName,
            connectionId: connection.id,
          });
        }
      }
    } catch (notifErr) {
      logger.error("[portal/connections] Notification error:", notifErr);
    }

    return NextResponse.json({
      success: true,
      connection,
      message: "Connection request sent",
    });
  } catch (error) {
    logger.error("[connections POST] Error:", error);
    return NextResponse.json({ error: "Failed to send connection request" }, { status: 500 });
  }
}

/**
 * GET - Get all connections for the current client
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find client
    const client = await prisma.client.findFirst({
      where: { userId },
    });

    if (!client) {
      return NextResponse.json({ connections: [] });
    }

    // Get all connections with contractor details
    const connections = await prisma.clientProConnection.findMany({
      where: { clientId: client.id },
      include: {
        tradesCompany: {
          select: {
            id: true,
            name: true,
            logo: true,
            coverimage: true,
            specialties: true,
            city: true,
            state: true,
            isVerified: true,
            rating: true,
            reviewCount: true,
            phone: true,
            email: true,
            members: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                avatar: true,
              },
              take: 3,
              orderBy: { role: "asc" },
            },
          },
        },
      },
      orderBy: { invitedAt: "desc" },
    });

    // Transform to match UI format
    const pros = connections.map((conn) => {
      // Build a display name: prefer the primary member's name, fall back to company name
      const primaryMember = conn.tradesCompany.members?.[0];
      const memberName = primaryMember
        ? [primaryMember.firstName, primaryMember.lastName].filter(Boolean).join(" ")
        : null;
      const displayName = memberName || conn.tradesCompany.name;

      return {
        id: conn.tradesCompany.id,
        name: displayName,
        companyName: conn.tradesCompany.name,
        logo: primaryMember?.avatar || conn.tradesCompany.logo,
        coverPhoto: conn.tradesCompany.coverimage,
        specialties: conn.tradesCompany.specialties,
        location: [conn.tradesCompany.city, conn.tradesCompany.state].filter(Boolean).join(", "),
        rating: conn.tradesCompany.rating,
        reviewCount: conn.tradesCompany.reviewCount,
        verified: conn.tradesCompany.isVerified,
        phoneNumber: conn.tradesCompany.phone,
        email: conn.tradesCompany.email,
        connectionStatus: conn.status, // "pending", "accepted", "connected"
        connectedAt: conn.connectedAt?.toISOString(),
      };
    });

    return NextResponse.json({ connections: pros });
  } catch (error) {
    logger.error("[connections GET] Error:", error);
    return NextResponse.json({ connections: [] });
  }
}
