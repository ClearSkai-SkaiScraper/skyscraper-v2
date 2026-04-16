export const dynamic = "force-dynamic";

// eslint-disable-next-line no-restricted-imports
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/client/connections
 * Returns the list of pros that a client is connected to
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resilient client lookup: userId → email fallback
    let client = await prisma.client.findFirst({
      where: { userId },
    });

    if (!client) {
      // Fallback: try by email from Clerk
      try {
        const clerkUser = await currentUser();
        const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
        if (email) {
          client = await prisma.client.findFirst({
            where: { email, userId: null },
          });
          if (client) {
            try {
              await prisma.client.update({
                where: { id: client.id },
                data: { userId },
              });
            } catch {
              /* userId unique constraint */
            }
          }
        }
      } catch {
        /* currentUser() failed */
      }
    }

    if (!client) {
      return NextResponse.json({ connections: [] });
    }

    // Get connections from ClientProConnection
    const connections = await prisma.clientProConnection.findMany({
      where: {
        clientId: client.id,
        status: { in: ["accepted", "pending"] },
      },
      include: {
        tradesCompany: {
          select: {
            id: true,
            name: true,
            logo: true,
            specialties: true,
          },
        },
      },
      orderBy: { connectedAt: "desc" },
    });

    // Map to a simpler format
    const pros = connections.map((c) => ({
      id: c.contractorId,
      name: c.tradesCompany?.name || "Unknown Company",
      logo: c.tradesCompany?.logo,
      specialties: c.tradesCompany?.specialties || [],
      connectedAt: c.connectedAt,
    }));

    // Also check legacy: if client has an orgId, find the tradesCompany for that org
    if (pros.length === 0 && client.orgId) {
      try {
        // Find tradesCompanyMembers in the client's org
        const orgMembers = await prisma.tradesCompanyMember.findMany({
          where: { orgId: client.orgId },
          select: { companyId: true },
          distinct: ["companyId"],
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const companyIds = orgMembers.map((m: any) => m.companyId).filter(Boolean);
        if (companyIds.length > 0) {
          const companies = await prisma.tradesCompany.findMany({
            where: { id: { in: companyIds } },
            select: { id: true, name: true, logo: true, specialties: true },
          });
          for (const co of companies) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!pros.find((p: any) => p.id === co.id)) {
              pros.push({
                id: co.id,
                name: co.name || "Unknown Company",
                logo: co.logo,
                specialties: co.specialties || [],
                connectedAt: null,
              });
            }
          }
        }
      } catch {
        // Non-critical fallback
      }
    }

    // Also check if client has existing message threads (they've been messaged before)
    if (pros.length === 0) {
      try {
        const existingThreads = await prisma.messageThread.findMany({
          where: { clientId: client.id },
          select: { tradePartnerId: true },
          distinct: ["tradePartnerId"],
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const partnerIds = existingThreads.map((t: any) => t.tradePartnerId).filter(Boolean);
        if (partnerIds.length > 0) {
          const companies = await prisma.tradesCompany.findMany({
            where: { id: { in: partnerIds } },
            select: { id: true, name: true, logo: true, specialties: true },
          });
          for (const co of companies) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!pros.find((p: any) => p.id === co.id)) {
              pros.push({
                id: co.id,
                name: co.name || "Unknown Company",
                logo: co.logo,
                specialties: co.specialties || [],
                connectedAt: null,
              });
            }
          }
        }
      } catch {
        // Non-critical fallback
      }
    }

    return NextResponse.json({ connections: pros });
  } catch (error) {
    logger.error("[client/connections] Error:", error);
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
  }
}
