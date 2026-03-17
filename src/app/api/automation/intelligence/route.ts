// app/api/automation/intelligence/route.ts
/**
 * GET /api/automation/intelligence
 *
 * Gets automation intelligence for a claim (tasks, alerts, recommendations)
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { getClaimAutomationIntelligence } from "@/lib/intel/automation/engine";
import { logger } from "@/lib/observability/logger";

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get("claimId");

    if (!claimId) {
      return NextResponse.json({ error: "Missing claimId" }, { status: 400 });
    }

    // orgId is DB-backed UUID from withAuth
    const intelligence = await getClaimAutomationIntelligence(claimId, orgId);

    return NextResponse.json(intelligence);
  } catch (error) {
    logger.error("[AUTOMATION INTELLIGENCE] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch intelligence", details: String(error) },
      { status: 500 }
    );
  }
});
