export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { createId } from "@paralleldrive/cuid2";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/portal/job-invite
 * Creates a ClientWorkRequest targeted at a specific contractor (tradesCompany).
 * This is the "invite a pro" flow from the portal.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve client record
    const client = await prisma.client.findFirst({
      where: { userId },
    });
    if (!client) {
      return NextResponse.json({ error: "Client profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { companyId, jobDescription, serviceType } = body;

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    // Verify the target company exists
    const company = await prisma.tradesCompany.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      return NextResponse.json({ error: "Contractor company not found" }, { status: 404 });
    }

    // Create a real ClientWorkRequest targeted at this contractor
    const workRequest = await prisma.clientWorkRequest.create({
      data: {
        id: createId(),
        clientId: client.id,
        targetProId: companyId,
        title: serviceType || "Job Request",
        description: jobDescription || "",
        category: serviceType || "general",
        urgency: "normal",
        status: "pending",
        visibility: "private", // Direct invite, not public
        propertyAddress: client.address || undefined,
        city: client.city || undefined,
        state: client.state || undefined,
        zip: client.postal || undefined,
      },
    });

    logger.info("[JOB_INVITE] Created work request", {
      workRequestId: workRequest.id,
      clientId: client.id,
      targetProId: companyId,
      companyName: company.name,
    });

    return NextResponse.json({
      success: true,
      inviteId: workRequest.id,
      companyId,
      status: "sent",
      message: "Job invite sent successfully",
      createdAt: workRequest.createdAt.toISOString(),
    });
  } catch (error) {
    logger.error("[JOB_INVITE] Error:", error);
    return NextResponse.json({ error: "Failed to send job invite" }, { status: 500 });
  }
}
