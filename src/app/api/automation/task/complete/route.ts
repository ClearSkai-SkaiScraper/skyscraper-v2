export const dynamic = "force-dynamic";

// app/api/automation/task/complete/route.ts
/**
 * POST /api/automation/task/complete
 *
 * Completes an automation task
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { completeTask } from "@/lib/intel/automation/executors/tasks";
import { logger } from "@/lib/logger";

export const POST = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const body = await req.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }

    // orgId is DB-backed UUID from withAuth
    await completeTask(taskId, orgId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[TASK COMPLETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to complete task", details: String(error) },
      { status: 500 }
    );
  }
});
