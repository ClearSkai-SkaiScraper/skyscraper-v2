export const dynamic = "force-dynamic";

// app/api/automation/run/route.ts
/**
 * 🔥 DOMINUS AUTOMATION API
 * POST /api/automation/run
 *
 * Runs full automation pipeline for a claim
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { runSkaiAutomations } from "@/lib/intel/automation/engine";

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const body = await req.json();
    const { claimId } = body;

    if (!claimId) {
      return NextResponse.json({ error: "Missing claimId" }, { status: 400 });
    }

    logger.debug(`[API] Running Dominus automations for ${claimId}`);

    // Run the automation engine (orgId is DB-backed UUID from withAuth)
    const result = await runSkaiAutomations(claimId, orgId);

    return NextResponse.json({
      success: result.success,
      triggersDetected: result.triggersDetected.length,
      actionsExecuted: result.actionsExecuted,
      results: result.results,
      errors: result.errors,
    });
  } catch (error) {
    logger.error("[AUTOMATION API] Error:", error);
    return NextResponse.json(
      { error: "Automation failed", details: String(error) },
      { status: 500 }
    );
  }
});
