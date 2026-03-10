export const dynamic = "force-dynamic";

/**
 * 🔥 PHASE F: Complete Task
 *
 * POST /api/tasks/[id]/complete
 * Migrated to withOrgScope for DB-verified org scoping.
 */

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
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
        where: { id: taskId },
        data: {
          status: "DONE",
          completedAt: new Date(),
        },
      });

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
