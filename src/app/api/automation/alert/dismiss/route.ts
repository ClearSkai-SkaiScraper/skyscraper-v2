export const dynamic = "force-dynamic";

// app/api/automation/alert/dismiss/route.ts
/**
 * POST /api/automation/alert/dismiss
 *
 * Dismisses an alert
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { getDelegate } from "@/lib/db/modelAliases";
import { logger } from "@/lib/logger";

export const POST = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const body = await req.json();
    const { alertId } = body;

    if (!alertId) {
      return NextResponse.json({ error: "Missing alertId" }, { status: 400 });
    }

    await getDelegate("automationAlert").update({
      where: { id: alertId, orgId },
      data: { isDismissed: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[ALERT DISMISS] Error:", error);
    return NextResponse.json(
      { error: "Failed to dismiss alert", details: String(error) },
      { status: 500 }
    );
  }
});
