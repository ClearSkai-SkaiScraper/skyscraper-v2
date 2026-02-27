/**
 * GET /api/trades/opportunities
 * Returns work opportunities and trade invites for the authenticated user.
 * Feeds the WorkOpportunityNotifications dashboard widget.
 *
 * - opportunities: ClientWorkRequest records targeting the user's company (or open)
 * - invites: ClientProConnection requests pending for the user's company
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ opportunities: [], invites: [] });
    }

    // Find the user's trades company membership
    const member = await prisma.tradesCompanyMember.findUnique({
      where: { userId },
      select: { companyId: true, id: true },
    });

    // ── 1. Opportunities: ClientWorkRequests that target this company or are open ──
    const opportunities: any[] = [];

    if (member?.companyId) {
      try {
        const workRequests = await prisma.clientWorkRequest.findMany({
          where: {
            OR: [{ targetProId: member.companyId }, { targetProId: null, status: "pending" }],
            status: { in: ["pending", "submitted"] },
          },
          include: {
            Client: {
              select: { name: true, city: true, state: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        for (const wr of workRequests) {
          opportunities.push({
            id: wr.id,
            title: wr.title,
            description:
              wr.description.length > 120 ? wr.description.slice(0, 120) + "…" : wr.description,
            location:
              [wr.Client?.city, wr.Client?.state].filter(Boolean).join(", ") ||
              wr.propertyAddress ||
              "Location not specified",
            trade: wr.category,
            urgency: wr.urgency === "emergency" ? "high" : wr.urgency === "soon" ? "medium" : "low",
            postedAt: wr.createdAt.toISOString(),
            clientName: wr.Client?.name || undefined,
            estimatedValue: undefined,
          });
        }
      } catch (e) {
        logger.warn("[trades/opportunities] ClientWorkRequest query error:", e);
      }
    }

    // ── 2. Invites: Pending ClientProConnection requests ──
    const invites: any[] = [];

    if (member?.companyId) {
      try {
        const pending = await prisma.clientProConnection.findMany({
          where: {
            contractorId: member.companyId,
            status: "pending",
          },
          include: {
            Client: {
              select: { name: true, firstName: true, lastName: true },
            },
          },
          orderBy: { invitedAt: "desc" },
          take: 10,
        });

        // Get the company name for display
        const company = await prisma.tradesCompany.findUnique({
          where: { id: member.companyId },
          select: { name: true },
        });

        for (const conn of pending) {
          const clientName =
            [conn.Client?.firstName, conn.Client?.lastName].filter(Boolean).join(" ") ||
            conn.Client?.name ||
            "A client";

          invites.push({
            id: conn.id,
            fromName: clientName,
            fromCompany: clientName,
            projectTitle: `${clientName} wants to connect`,
            message: conn.notes || undefined,
            createdAt: conn.invitedAt.toISOString(),
            status: "PENDING",
          });
        }
      } catch (e) {
        logger.warn("[trades/opportunities] ClientProConnection query error:", e);
      }
    }

    return NextResponse.json({ opportunities, invites });
  } catch (error) {
    logger.error("[GET /api/trades/opportunities]", error);
    return NextResponse.json({ opportunities: [], invites: [] });
  }
}
