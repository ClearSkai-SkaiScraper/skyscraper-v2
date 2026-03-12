export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { createId } from "@paralleldrive/cuid2";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get client record
    const client = await prisma.client.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ workRequests: [] });
    }

    // Fetch actual work requests from database
    const workRequests = await prisma.clientWorkRequest.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ workRequests });
  } catch (error) {
    logger.error("Portal work-requests GET error:", error);
    return NextResponse.json({ error: "Failed to fetch work requests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category, serviceType, urgency, propertyAddress, budget } = body;

    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    // Get or create client record
    let client = await prisma.client.findFirst({
      where: { userId },
      select: { id: true, firstName: true, lastName: true, name: true, email: true, phone: true },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          id: createId(),
          slug: `client-${createId()}`,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        select: { id: true, firstName: true, lastName: true, name: true, email: true, phone: true },
      });
    }

    // Create work request in database
    const workRequest = await prisma.clientWorkRequest.create({
      data: {
        id: createId(),
        clientId: client.id,
        title: title || "Work Request",
        description,
        category: category || serviceType || "general",
        urgency: urgency || "normal",
        propertyAddress: propertyAddress || null,
        budget: budget || null,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    logger.info("[WORK_REQUEST_CREATE]", { userId, workRequestId: workRequest.id });

    // ── Bridge to pro's leads table ──────────────────────────────
    // If the client is connected to a pro, create a mirror lead
    // so the work request appears in the pro's workspace automatically.
    try {
      const proConnection = await prisma.clientProConnection.findFirst({
        where: {
          clientId: client.id,
          status: { in: ["connected", "accepted"] },
        },
        include: {
          tradesCompany: { select: { orgId: true } },
        },
        orderBy: { connectedAt: "desc" },
      });

      const proOrgId = proConnection?.tradesCompany?.orgId;
      if (proOrgId) {
        // Ensure a contacts record exists in the pro's org
        let contact = await prisma.contacts.findFirst({
          where: { orgId: proOrgId, email: client.email ?? undefined },
        });

        if (!contact) {
          contact = await prisma.contacts.create({
            data: {
              id: crypto.randomUUID(),
              orgId: proOrgId,
              firstName: client.firstName || client.name || "Client",
              lastName: client.lastName || "",
              email: client.email || null,
              phone: client.phone || null,
              source: "portal",
              tags: ["portal-client"],
              updatedAt: new Date(),
            },
          });
        }

        await prisma.leads.create({
          data: {
            id: crypto.randomUUID(),
            orgId: proOrgId,
            contactId: contact.id,
            title: (title || "Work Request").trim(),
            description: description?.trim() || null,
            source: "client_portal",
            stage: "new",
            temperature: "hot",
            jobCategory: "out_of_pocket",
            jobType: category || serviceType || null,
            urgency: urgency || "normal",
            budget: budget ? parseInt(budget) : null,
            clientId: client.id,
            value: budget ? parseInt(budget) : null,
            updatedAt: new Date(),
          },
        });

        logger.info("[WORK_REQUEST_BRIDGE]", {
          workRequestId: workRequest.id,
          proOrgId,
          clientId: client.id,
        });
      }
    } catch (bridgeError) {
      // Don't fail the work request creation if bridging fails
      logger.error("[WORK_REQUEST_BRIDGE] Failed to bridge to pro leads:", bridgeError);
    }

    return NextResponse.json(
      {
        id: workRequest.id,
        status: workRequest.status,
        description: workRequest.description,
        category: workRequest.category,
        urgency: workRequest.urgency,
        createdAt: workRequest.createdAt.toISOString(),
        message: "Work request submitted successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Portal work-requests POST error:", error);
    return NextResponse.json({ error: "Failed to create work request" }, { status: 500 });
  }
}
