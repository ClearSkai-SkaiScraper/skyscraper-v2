export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (request: NextRequest, { orgId }) => {
  try {
    const body = await request.json();
    const { subject, description, priority, clientId } = body;

    if (!subject || !description) {
      return NextResponse.json(
        { success: false, error: "Subject and description are required" },
        { status: 400 }
      );
    }

    // Create a client request record
    const clientRequest = await prisma.tasks.create({
      data: {
        id: crypto.randomUUID(),
        title: subject,
        description,
        priority: (priority?.toUpperCase() || "MEDIUM") as any,
        status: "TODO" as any,
        type: "CLIENT_REQUEST",
        orgId,
        notes: `Client request submitted via portal${clientId ? ` (clientId: ${clientId})` : ""}`,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: clientRequest,
    });
  } catch (error) {
    logger.error("[ClientRequest] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit request" },
      { status: 500 }
    );
  }
});
