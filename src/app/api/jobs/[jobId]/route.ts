/**
 * Job Status API
 *
 * GET /api/jobs/[jobId]
 * Returns the latest status and events for a specific job.
 *
 * Response:
 * {
 *   "job": {
 *     "id": "...",
 *     "job_name": "...",
 *     "status": "...",
 *     "message": "...",
 *     "result": {...},
 *     "attempts": 0,
 *     "created_at": "...",
 *     "events": [...]
 *   }
 * }
 */

// IMPORTANT: Use Node.js runtime for pg compatibility (not Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { requireApiAuth } from "@/lib/auth/apiAuth";
import { pgPool } from "@/lib/db";

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  // Use unified auth helper instead of direct auth() call
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { userId, orgId } = authResult;

  // Get a client from the pool
  const client = await pgPool.connect();

  try {
    const { jobId } = params;

    // Get all events for this job
    const result = await client.query(
      `
      SELECT 
        id,
        job_name,
        job_id,
        status,
        message,
        payload,
        result,
        attempts,
        created_at
      FROM job_events
      WHERE job_id = $1
      ORDER BY created_at ASC
    `,
      [jobId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Get the latest event (most recent status)
    const latestEvent = result.rows[result.rows.length - 1];

    return NextResponse.json({
      job: {
        ...latestEvent,
        events: result.rows, // All events for this job
      },
    });
  } catch (error) {
    logger.error("[API ERROR] /api/jobs/[jobId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    // IMPORTANT: Release the client back to the pool (DO NOT call pool.end()!)
    client.release();
  }
}
