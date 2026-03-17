export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// API: GET AI JOB STATUS
// ============================================================================
// GET /api/ai/status?jobId=xxx
// Returns: { id, status, reportId, engine, createdAt, completedAt?, error?, result? }

import { NextRequest, NextResponse } from "next/server";

import { type AiBillingContext,createAiConfig, withAiBilling } from "@/lib/ai/withAiBilling";
import { logger } from "@/lib/logger";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";
import { getStatus } from "@/modules/ai/jobs/queue";

async function GET_INNER(req: NextRequest, ctx: AiBillingContext) {
  try {
    const { userId } = ctx;

    const identifier = getRateLimitIdentifier(userId, req);
    const allowed = await rateLimiters.ai.check(20, identifier);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const jobId = req.nextUrl.searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    const job = getStatus(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    logger.error("[AI Status API]", error);
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
  }
}

export const GET = withAiBilling(createAiConfig("ai_status", { costPerRequest: 0 }), GET_INNER);
