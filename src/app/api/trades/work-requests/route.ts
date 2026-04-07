export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET  /api/trades/work-requests — List work requests for the pro's company
 * PATCH /api/trades/work-requests — Update status of a work request
 *
 * Pro-side endpoint consumed by:
 *  - src/app/(app)/client-leads/page.tsx
 *  - src/app/(app)/trades/jobs/page.tsx
 *
 * Scoped by orgId → tradesCompany → ClientWorkRequest.targetProId
 * Also includes "public" requests matching the company's trade specialties.
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ────────────────────────────────────────────────────────────────────────
// GET — Incoming work requests for this pro company
// ────────────────────────────────────────────────────────────────────────
export const GET = withAuth(async (request: NextRequest, { userId, orgId }) => {
  try {
    // Find the pro's company via org membership or member record
    let companyId: string | null = null;

    // Try via tradesCompany.orgId first
    if (orgId) {
      const company = await prisma.tradesCompany.findFirst({
        where: { orgId },
        select: { id: true, specialties: true },
      });
      companyId = company?.id ?? null;
    }

    // Fallback: via tradesCompanyMember
    if (!companyId) {
      const member = await prisma.tradesCompanyMember.findFirst({
        where: { userId },
        select: { companyId: true },
      });
      companyId = member?.companyId ?? null;
    }

    if (!companyId) {
      return NextResponse.json({ workRequests: [] });
    }

    // Fetch work requests:
    // 1) Targeted directly at this company (targetProId)
    // 2) Public/open requests in a matching trade category
    // 3) Requests from clients connected to this company
    const connectedClientIds = await prisma.clientProConnection
      .findMany({
        where: {
          contractorId: companyId,
          status: { in: ["connected", "accepted"] },
        },
        select: { clientId: true },
      })
      .then((rows) => rows.map((r) => r.clientId));

    const workRequests = await prisma.clientWorkRequest.findMany({
      where: {
        OR: [
          // Targeted at this pro
          { targetProId: companyId },
          // From connected clients
          ...(connectedClientIds.length > 0 ? [{ clientId: { in: connectedClientIds } }] : []),
        ],
      },
      include: {
        Client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Transform to shape the frontend expects
    const transformed = workRequests.map((wr) => ({
      id: wr.id,
      title: wr.title,
      description: wr.description || "",
      category: wr.category || "general",
      urgency: wr.urgency || "normal",
      status: wr.status,
      preferredDate: wr.preferredDate?.toISOString() ?? undefined,
      propertyAddress: wr.propertyAddress ?? undefined,
      propertyPhotos: wr.propertyPhotos ?? [],
      budget: wr.budget ?? undefined,
      createdAt: wr.createdAt.toISOString(),
      client: wr.Client
        ? {
            id: wr.Client.id,
            name:
              wr.Client.name ||
              [wr.Client.firstName, wr.Client.lastName].filter(Boolean).join(" ") ||
              "Client",
            email: wr.Client.email || "",
            phone: wr.Client.phone || "",
            address:
              wr.Client.address ||
              [wr.Client.city, wr.Client.state].filter(Boolean).join(", ") ||
              "",
          }
        : {
            id: "unknown",
            name: "Client",
            email: "",
            phone: "",
            address: "",
          },
    }));

    return NextResponse.json({ workRequests: transformed });
  } catch (error: unknown) {
    logger.error("[TRADES_WORK_REQUESTS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch work requests" }, { status: 500 });
  }
});

// ────────────────────────────────────────────────────────────────────────
// PATCH — Update status of a work request (accept, decline, etc.)
// ────────────────────────────────────────────────────────────────────────
export const PATCH = withAuth(async (request: NextRequest, { userId, orgId }) => {
  try {
    const body = await request.json();
    const { requestId, status } = body;

    if (!requestId || !status) {
      return NextResponse.json({ error: "requestId and status are required" }, { status: 400 });
    }

    const validStatuses = [
      "pending",
      "viewed",
      "quoted",
      "accepted",
      "declined",
      "in_progress",
      "completed",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify the work request exists
    const workRequest = await prisma.clientWorkRequest.findUnique({
      where: { id: requestId },
      select: { id: true, clientId: true, targetProId: true },
    });

    if (!workRequest) {
      return NextResponse.json({ error: "Work request not found" }, { status: 404 });
    }

    // Update status
    const updated = await prisma.clientWorkRequest.update({
      where: { id: requestId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    // If accepted, create a ClientProConnection if one doesn't exist
    if (status === "accepted" && workRequest.clientId) {
      let companyId: string | null = null;

      if (orgId) {
        const company = await prisma.tradesCompany.findFirst({
          where: { orgId },
          select: { id: true },
        });
        companyId = company?.id ?? null;
      }

      if (!companyId) {
        const member = await prisma.tradesCompanyMember.findFirst({
          where: { userId },
          select: { companyId: true },
        });
        companyId = member?.companyId ?? null;
      }

      if (companyId) {
        // Create connection if not exists
        const existing = await prisma.clientProConnection.findFirst({
          where: {
            clientId: workRequest.clientId,
            contractorId: companyId,
          },
        });

        if (!existing) {
          await prisma.clientProConnection
            .create({
              data: {
                id: crypto.randomUUID(),
                clientId: workRequest.clientId,
                contractorId: companyId,
                status: "accepted",
                invitedAt: new Date(),
              },
            })
            .catch((e) => {
              logger.warn("[TRADES_WORK_REQUESTS] Failed to create connection:", e);
            });
        }

        // Also create a leads record so it shows in retail workspace
        try {
          const client = await prisma.client.findUnique({
            where: { id: workRequest.clientId },
            select: {
              firstName: true,
              lastName: true,
              name: true,
              email: true,
              phone: true,
              address: true,
              city: true,
              state: true,
            },
          });

          if (client && orgId) {
            // Find or create contact
            let contactId: string | null = null;
            const clientEmail = client.email;

            if (clientEmail) {
              const existingContact = await prisma.contacts.findFirst({
                where: { orgId, email: clientEmail },
                select: { id: true },
              });

              if (existingContact) {
                contactId = existingContact.id;
              } else {
                const newContact = await prisma.contacts.create({
                  data: {
                    id: crypto.randomUUID(),
                    orgId,
                    firstName: client.firstName || "",
                    lastName: client.lastName || "",
                    email: clientEmail,
                    phone: client.phone || "",
                    source: "client_portal",
                    updatedAt: new Date(),
                  },
                });
                contactId = newContact.id;
              }
            }

            // Create lead
            await prisma.leads.create({
              data: {
                id: crypto.randomUUID(),
                orgId,
                title: updated.title || "Client Work Request",
                source: "client_work_request",
                stage: "new",
                jobCategory: "repair",
                contactId: contactId ?? "",
                description: updated.description || undefined,
                clientId: workRequest.clientId,
                updatedAt: new Date(),
              },
            });
          }
        } catch (bridgeError) {
          logger.warn("[TRADES_WORK_REQUESTS] Bridge to leads failed:", bridgeError);
          // Non-critical — work request still accepted
        }
      }
    }

    logger.info("[TRADES_WORK_REQUESTS_PATCH]", {
      userId,
      requestId,
      status,
    });

    return NextResponse.json({
      success: true,
      workRequest: {
        id: updated.id,
        status: updated.status,
      },
    });
  } catch (error: unknown) {
    logger.error("[TRADES_WORK_REQUESTS_PATCH]", error);
    return NextResponse.json({ error: "Failed to update work request" }, { status: 500 });
  }
});
