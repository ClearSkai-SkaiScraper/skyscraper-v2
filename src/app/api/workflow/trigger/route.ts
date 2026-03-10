export const dynamic = "force-dynamic";

/**
 * POST /api/workflow/trigger
 * Manually trigger workflow stage change
 */

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { z } from "zod";

import { withOrgScope } from "@/lib/auth/tenant";
import { triggerStage } from "@/lib/workflow/automationEngine";

const TriggerSchema = z.object({
  leadId: z.string(),
  stageName: z.string(),
  eventType: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const POST = withOrgScope(async (request: Request, { userId, orgId }) => {
  try {
    const body = await request.json();
    const { leadId, stageName, eventType, metadata } = TriggerSchema.parse(body);

    // Trigger the stage — orgId is DB-verified
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
    return NextResponse.json({ error: "Failed to trigger workflow" }, { status: 500 });
  }
});
