export const dynamic = "force-dynamic";

/**
 * Connect Pro API - Client Portal
 * Creates a connection request from client to a pro
 */

import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { notifyConnectionRequest } from "@/lib/services/tradesNotifications";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 100 req/min per user
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { proId } = body;

    if (!proId) {
      return NextResponse.json({ error: "Pro ID is required" }, { status: 400 });
    }

    // proId might be a tradesCompanyMember.id or tradesCompany.id
    // First try to find the tradesCompanyMember, then get their company
    let companyId = proId;
    let targetMember: {
      id: string;
      userId: string;
      companyName: string | null;
      firstName: string | null;
      lastName: string | null;
      companyId: string | null;
    } | null = null;

    // Check if this is a member ID
    const member = await prisma.tradesCompanyMember.findFirst({
      where: { id: proId },
      select: {
        id: true,
        companyId: true,
        companyName: true,
        userId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (member) {
      targetMember = member;
      // If member has a company, use company ID
      if (member.companyId) {
        companyId = member.companyId;
      } else {
        // Member doesn't have a company - create one
        const memberCompanyName =
          member.companyName ||
          `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
          `Pro-${member.id.slice(-8)}`;

        let company = await prisma.tradesCompany.findFirst({
          where: { name: memberCompanyName },
        });

        if (!company) {
          company = await prisma.tradesCompany.create({
            data: {
              name: memberCompanyName,
              slug: `company-${member.id.slice(-8)}`,
              isActive: true,
            },
          });
        }

        // Link member to company
        await prisma.tradesCompanyMember.update({
          where: { id: member.id },
          data: { companyId: company.id },
        });

        companyId = company.id;
      }
    }

    // Verify the company exists - if member was found we already have a valid companyId
    // If no member was found, try to find company directly
    let company: Awaited<ReturnType<typeof prisma.tradesCompany.findUnique>> = null;
    if (targetMember) {
      company = await prisma.tradesCompany.findUnique({
        where: { id: companyId },
      });
    } else {
      // No member found - try as direct company ID
      company = await prisma.tradesCompany.findUnique({
        where: { id: proId },
      });
      if (company) {
        companyId = company.id;
      }
    }

    if (!company) {
      logger.error(`[connect-pro] Company not found for proId: ${proId}`);
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    // Get the client profile
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
      const status = existingConnection.status?.toLowerCase();
      const isConnected = status === "accepted" || status === "connected";
      const isPending = status === "pending";

      return NextResponse.json({
        success: true,
        connection: existingConnection,
        connectionStatus: isConnected ? "connected" : isPending ? "pending" : status,
        message: isConnected
          ? "Already connected"
          : isPending
            ? "Connection request pending"
            : "Connection exists",
      });
    }

    // Create the connection
    const connection = await prisma.clientProConnection.create({
      data: {
        id: crypto.randomUUID(),
        clientId: client.id,
        contractorId: companyId,
        status: "pending",
        notes: "Connection initiated via client search",
        invitedAt: new Date(),
      },
    });

    // Log connection for pro notification (ProjectNotification requires orgId/claimId context)
    try {
      const companyMembers = await prisma.tradesCompanyMember.findMany({
        where: { companyId },
        select: { userId: true },
      });

      logger.info(
        `[connect-pro] Connection created: ${connection.id}. Notifying ${companyMembers.length} company members.`
      );

      // Send notification to each pro team member
      const clientName =
        [client.firstName, client.lastName].filter(Boolean).join(" ") || client.name || "A client";

      for (const member of companyMembers) {
        if (member.userId) {
          await notifyConnectionRequest({
            proClerkId: member.userId,
            clientName,
            connectionId: connection.id,
          });
          logger.debug(`[connect-pro] Notification sent to member: ${member.userId}`);
        }
      }
    } catch (notifErr) {
      logger.debug("[connect-pro] Notification error:", notifErr);
    }

    return NextResponse.json({
      success: true,
      connection,
      message: "Connection request sent",
    });
  } catch (error) {
    logger.error("[POST /api/portal/connect-pro] Error:", error);
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 });
  }
}

// GET - Check connection status with a pro
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const proId = searchParams.get("proId");

    // Get client
    const email = user.emailAddresses?.[0]?.emailAddress;
    const client = await prisma.client.findFirst({
      where: {
        OR: [{ userId }, { email }],
      },
    });

    if (!client) {
      return NextResponse.json({ connected: false, status: null });
    }

    if (proId) {
      // Check specific pro connection
      const connection = await prisma.clientProConnection.findFirst({
        where: {
          clientId: client.id,
          contractorId: proId,
        },
      });

      const status = connection?.status?.toLowerCase();
      return NextResponse.json({
        connected: status === "accepted" || status === "connected",
        pending: status === "pending",
        status: connection?.status || null,
        connectionStatus:
          status === "accepted" || status === "connected"
            ? "connected"
            : status === "pending"
              ? "pending"
              : null,
        connectionId: connection?.id || null,
      });
    }

    // Get all connected pro IDs
    const connections = await prisma.clientProConnection.findMany({
      where: {
        clientId: client.id,
        status: { in: ["ACCEPTED", "PENDING", "accepted", "pending", "connected"] },
      },
      select: {
        contractorId: true,
        status: true,
      },
    });

    return NextResponse.json({
      connectedProIds: connections
        .filter((c) => {
          const status = c.status?.toLowerCase();
          return status === "accepted" || status === "connected";
        })
        .map((c) => c.contractorId),
      pendingProIds: connections
        .filter((c) => c.status?.toLowerCase() === "pending")
        .map((c) => c.contractorId),
    });
  } catch (error) {
    logger.error("[GET /api/portal/connect-pro] Error:", error);
    return NextResponse.json({ error: "Failed to check connection" }, { status: 500 });
  }
}
