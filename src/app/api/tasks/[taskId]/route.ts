export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDelegate } from "@/lib/db/modelAliases";
import { sendTemplatedNotification } from "@/lib/notifications/templates";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const UpdateTaskSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
  dueAt: z.string().optional(),
  completedAt: z.string().optional(),
});

/**
 * PUT /api/tasks/[taskId]
 * Update task status, assignee, due date, etc.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    const { taskId } = await params;
    const body = await req.json();
    const input = UpdateTaskSchema.parse(body);

    // Update task (atomic find+update to prevent TOCTOU race)
    const { task, existing } = await prisma.$transaction(async (tx) => {
      const existing = await tx.tasks.findFirst({ where: { id: taskId, orgId } });
      if (!existing) return { task: null, existing: null };
      const task = await tx.tasks.update({
        where: { id: taskId },
        data: {
          ...(input.status && { status: input.status }),
          ...(input.priority && { priority: input.priority }),
          ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
          ...(input.dueAt !== undefined && { dueAt: new Date(input.dueAt) }),
          ...(input.completedAt !== undefined && { completedAt: new Date(input.completedAt) }),
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      return { task, existing };
    });
    if (!task || !existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Create timeline event if status changed to done
    if (input.status === "DONE" && existing.status !== "DONE" && existing.claimId) {
      const user = await prisma.users.findFirst({
        where: { clerkUserId: userId, orgId },
      });

      if (user) {
        await getDelegate("claimTimelineEvent").create({
          data: {
            orgId,
            claim_id: existing.claimId,
            type: "task_completed",
            description: `Task completed: ${existing.title}`,
            actorId: user.id,
            actorType: "user",
            relatedIds: { taskId: task.id },
            occurredAt: new Date(),
          },
        });
      }
    }

    // Send TASK_COMPLETED notification to the creator (if different from updater)
    if (input.status === "DONE" && existing.status !== "DONE") {
      try {
        // Notify assignee if task was completed by someone else
        const assignee = existing.assigneeId;
        if (assignee && assignee !== userId) {
          await sendTemplatedNotification("TASK_COMPLETED", assignee, {
            taskName: existing.title,
            taskId: task.id,
          });
        }
      } catch (notifError) {
        logger.error("[Task Update] Notification error:", notifError);
      }
    }

    return NextResponse.json({ task });
  } catch (error) {
    logger.error("[Task Update] PUT error:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

/**
 * DELETE /api/tasks/[taskId]
 * Delete a task
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    // Atomic org-scoped delete
    const result = await prisma.tasks.deleteMany({
      where: { id: taskId, orgId },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[Task Delete] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
