export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ workRequests: [] });
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
    const { description, serviceType, urgency } = body;

    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    logger.info("Work request submitted by user " + userId);

    return NextResponse.json(
      {
        id: "wr_" + Date.now(),
        status: "pending",
        description,
        serviceType: serviceType || "general",
        urgency: urgency || "normal",
        createdAt: new Date().toISOString(),
        message: "Work request submitted successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Portal work-requests POST error:", error);
    return NextResponse.json({ error: "Failed to create work request" }, { status: 500 });
  }
}
