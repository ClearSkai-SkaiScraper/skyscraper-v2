import { NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/cron/verifyCronSecret";
import { log } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface TaskResult {
  task: string;
  deleted?: number;
  archived?: number;
  claims?: number;
  orgs?: number;
  error?: string;
}

/**
 * GET /api/cron/daily
 * Daily maintenance tasks:
 * - Purge temp files
 * - Expire old tokens
 * - Validate storage
 * - Clean old logs
 *
 * Set up in Vercel Cron or external monitor
 */
export async function GET(req: Request) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  try {
    const tasks: TaskResult[] = [];

    // Task 1: Clean old webhook events (>30 days)
    try {
      const deleted = await prisma.webhookEvent.deleteMany({
        where: {
          createdAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });
      tasks.push({ task: "webhook_events_cleanup", deleted: deleted.count });
    } catch (e) {
      tasks.push({ task: "webhook_events_cleanup", error: "failed" });
    }

    // Task 2: Clean old claim activities (>90 days)
    try {
      const deleted = await prisma.claim_activities.deleteMany({
        where: {
          created_at: {
            lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          },
        },
      });
      tasks.push({ task: "claim_activities_cleanup", deleted: deleted.count });
    } catch (e) {
      tasks.push({ task: "claim_activities_cleanup", error: "failed" });
    }

    // Task 3: Log daily stats
    const claimsCount = await prisma.claims.count();
    const orgsCount = await prisma.org.count();
    tasks.push({ task: "daily_stats", claims: claimsCount, orgs: orgsCount });

    log.info("[cron/daily] Daily maintenance complete", { tasks });

    return NextResponse.json({
      ok: true,
      ran: true,
      version: "Ω.3",
      timestamp: new Date().toISOString(),
      tasks,
    });
  } catch (error) {
    const message = "Unknown error";
    log.error("[cron/daily] Daily maintenance failed", error instanceof Error ? error : undefined, {
      message,
    });
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
