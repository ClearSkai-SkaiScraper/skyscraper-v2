/**
 * Security Audit Agent
 * POST — Run an automated security posture snapshot for the org
 *
 * Returns: { orgId, score, suggestions[], anomalies[] }
 */
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const ctx = await safeOrgContext();
  if (ctx.status !== "ok" || !ctx.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const windowHours = body.windowHours ?? 24;
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    // Gather basic security metrics from the DB
    const [memberCount, recentLogins] = await Promise.all([
      prisma.membership.count({ where: { orgId: ctx.orgId } }),
      prisma.audit_logs
        .count({
          where: { orgId: ctx.orgId, createdAt: { gte: since } },
        })
        .catch(() => 0),
    ]);

    // Build a simple heuristic score
    const suggestions: string[] = [];
    let score = 100;

    if (memberCount > 20) {
      suggestions.push(
        "Consider reviewing member access — more than 20 users in the organization."
      );
      score -= 5;
    }

    if (recentLogins === 0) {
      suggestions.push("No recent activity logged. Ensure audit logging is enabled.");
      score -= 10;
    }

    // Placeholder anomaly detection — will be AI-powered in future
    const anomalies: { type: string; description: string }[] = [];

    logger.info("[AGENTS:SECURITY_AUDIT] Completed", { orgId: ctx.orgId, score });

    return NextResponse.json({
      orgId: ctx.orgId,
      score: Math.max(0, score),
      windowHours,
      suggestions,
      anomalies,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[AGENTS:SECURITY_AUDIT] Error", error);
    return NextResponse.json({ error: "Audit failed" }, { status: 500 });
  }
}
