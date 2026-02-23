/**
 * POST /api/workflow/trigger
 * Manually trigger workflow stage change
 */

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { triggerStage } from "@/lib/workflow/automationEngine";

const TriggerSchema = z.object({
  leadId: z.string(),
  stageName: z.string(),
  eventType: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { leadId, stageName, eventType, metadata } = TriggerSchema.parse(body);

    // Trigger the stage
    await triggerStage({
      leadId,
      orgId,
      stageName,
      eventType,
      metadata,
    });

    return NextResponse.json({
      success: true,
      message: `Triggered stage: ${stageName}`,
    });
  } catch (err) {
    logger.error("[Workflow Trigger Error]:", err);
    return NextResponse.json(
      { error: "Failed to trigger workflow" },
      { status: 500 }
    );
  }
}
