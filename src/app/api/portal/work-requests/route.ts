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
      select: { id: true },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          id: createId(),
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        select: { id: true },
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
