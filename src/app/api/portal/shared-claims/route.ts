export const dynamic = "force-dynamic";

// ORG-SCOPE: Scoped by userId/clientId — queries clientWorkRequest + leads by client.id. No cross-tenant risk.
/**
 * Shared Claims API for Client Portal
 * Returns jobs/projects shared with the client via accepted work requests
 *
 * Flow: Client submits work request → Pro accepts → ClientProConnection created
 *       → Accepted work requests show here as "shared projects" the client can track
 */

import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find client by userId
    const client = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!client) {
      return NextResponse.json({ claims: [] });
    }

    // 1. Get all accepted work requests for this client — these become "shared projects"
    const acceptedRequests = await prisma.clientWorkRequest.findMany({
      where: {
        clientId: client.id,
        status: { in: ["accepted", "in_progress", "completed"] },
      },
      include: {
        tradesCompany: {
          select: {
            id: true,
            name: true,
            logo: true,
            phone: true,
            specialties: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // 2. Also find any leads created from work requests (has clientId matching)
    let leadsForClient: any[] = [];
    try {
      leadsForClient = await prisma.leads.findMany({
        where: {
          clientId: client.id,
          source: "client_work_request",
        },
        select: {
          id: true,
          title: true,
          stage: true,
          claimId: true,
        },
      });
    } catch {
      // leads table may not have clientId column in all environments
    }

    const leadsByTitle = new Map(leadsForClient.map((l) => [l.title, l]));

    // Transform accepted requests into "shared claims" format for the frontend
    const transformed = acceptedRequests.map((wr) => {
      const matchedLead = leadsByTitle.get(wr.title);
      return {
        id: wr.id,
        claimNumber: `WR-${wr.id.slice(-6).toUpperCase()}`,
        address: wr.propertyAddress || "Address not provided",
        status: wr.status === "accepted" ? "in_progress" : wr.status,
        sharedAt: wr.updatedAt?.toISOString() || wr.createdAt?.toISOString(),
        title: wr.title,
        description: wr.description,
        category: wr.category,
        urgency: wr.urgency,
        photos: wr.propertyPhotos || [],
        leadId: matchedLead?.id || null,
        leadStage: matchedLead?.stage || null,
        contractor: wr.tradesCompany
          ? {
              id: wr.tradesCompany.id,
              name: wr.tradesCompany.name,
              logo: wr.tradesCompany.logo,
              phone: wr.tradesCompany.phone,
              trade: wr.tradesCompany.specialties?.[0] || null,
            }
          : null,
      };
    });

    return NextResponse.json({ claims: transformed });
  } catch (error) {
    logger.error("[SharedClaims GET] Error:", error);
    return NextResponse.json({ claims: [] });
  }
}
