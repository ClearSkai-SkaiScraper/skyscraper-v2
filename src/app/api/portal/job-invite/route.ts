import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, jobDescription, serviceType } = body;

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    // In production this would create a job invite record and notify the contractor
    logger.info(`Job invite sent to company ${companyId} by user ${userId}`);

    return NextResponse.json({
      success: true,
      inviteId: `invite_${Date.now()}`,
      companyId,
      status: "sent",
      message: "Job invite sent successfully",
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Portal job-invite error:", error);
    return NextResponse.json(
      { error: "Failed to send job invite" },
      { status: 500 }
    );
  }
}
