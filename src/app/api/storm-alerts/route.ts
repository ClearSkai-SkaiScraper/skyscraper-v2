/**
 * Storm Alert API — R5
 *
 * GET  → Get existing alerts for the org
 * POST → Trigger a new storm alert scan
 */

import { logger } from "@/lib/logger";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { checkForNewStormAlerts, getOrgAlerts } from "@/lib/storm-alerts/storm-alert-engine";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const ctx = await safeOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const alerts = await getOrgAlerts(ctx.orgId);
    return NextResponse.json({
      alerts,
      total: alerts.length,
      unacknowledged: alerts.filter((a) => !a.acknowledged).length,
    });
  } catch (err) {
    logger.error("[STORM_ALERT_API] GET failed:", err);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function POST() {
  const ctx = await safeOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await checkForNewStormAlerts(ctx.orgId);
    return NextResponse.json(result);
  } catch (err) {
    logger.error("[STORM_ALERT_API] POST failed:", err);
    return NextResponse.json({ error: "Failed to run storm alert scan" }, { status: 500 });
  }
}
