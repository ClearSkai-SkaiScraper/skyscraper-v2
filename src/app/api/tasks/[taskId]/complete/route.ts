export const dynamic = "force-dynamic";

/**
 * 🔥 PHASE F: Complete Task
 *
 * POST /api/tasks/[id]/complete
 * Migrated to withOrgScope for DB-verified org scoping.
 */

import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const POST = withOrgScope(
  async (req: Request, { userId, orgId }, context: { params: Promise<{ taskId: string }> }) => {
    try {
      const rl = await checkRateLimit(userId, "API");
      if (!rl.success) {
        return NextResponse.json(
          { error: "rate_limit_exceeded", message: "Too many requests" },
          { status: 429 }
        );
      }

      const { taskId } = await context.params;

      // Verify task belongs to org
      const task = await prisma.tasks.findFirst({
        where: { id: taskId, orgId },
      });

      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      // Mark as completed
      const updatedTask = await prisma.tasks.update({
        where: { id: taskId, orgId },
        data: {
          status: "DONE",
          completedAt: new Date(),
        },
      });

      // ── Log to Claim Timeline if task is linked to a claim (Pro-Only) ───────
      if (task.claimId) {
        try {
          const { nanoid } = await import("nanoid");
          await prisma.claim_timeline_events.create({
            data: {
              id: nanoid(),
              claim_id: task.claimId,
              type: "task_completed",
              description: `Task completed: "${task.title}"`,
              actor_id: userId,
              visible_to_client: false, // Pro-only, never shown to clients
              metadata: {
                title: `Task Completed: ${task.title}`,
                taskId: task.id,
                completedAt: new Date().toISOString(),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as unknown as any,
            },
          });
          logger.debug(
            `[POST /api/tasks/complete] Logged task completion to claim timeline for claim ${task.claimId}`
          );
        } catch (timelineError) {
          // Timeline logging failure should NOT block task completion
          logger.warn(
            "[POST /api/tasks/complete] Failed to log task completion to claim timeline:",
            timelineError
          );
        }
      }

      return NextResponse.json({
        success: true,
        task: updatedTask,
      });
    } catch (error) {
      logger.error("Error completing task:", error);
      return NextResponse.json(
        { error: "Failed to complete task", details: "Internal server error" },
        { status: 500 }
      );
    }
  }
);
