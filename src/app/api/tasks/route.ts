export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest } from "next/server";
import { z } from "zod";

import { getVisibleUserIds } from "@/lib/auth/managerScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { sendTemplatedNotification } from "@/lib/notifications/templates";
import { requirePermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";

// Prisma singleton imported from @/lib/db/prisma

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  description: z.string().trim().max(5000).nullish(),
  type: z.string().trim().max(100).nullish(),
  projectId: z.string().trim().max(200).nullish(),
  assigneeId: z.string().trim().max(200).nullish(),
  dueAt: z.string().nullish(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]).default("TODO"),
  contactId: z.string().trim().max(200).nullish(),
  leadId: z.string().trim().max(200).nullish(),
  claimId: z.string().trim().max(200).nullish(),
  inspectionId: z.string().trim().max(200).nullish(),
  notes: z.string().trim().max(5000).nullish(),
});

export const GET = withAuth(async (request: NextRequest, { orgId, userId }) => {
  try {
    await requirePermission("view_tasks");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const assigneeId = searchParams.get("assigneeId");
    const projectId = searchParams.get("projectId");
    const priority = searchParams.get("priority");
    const dueDate = searchParams.get("dueDate");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { orgId };
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    if (projectId) where.projectId = projectId;
    if (priority) where.priority = priority;

    if (dueDate === "overdue") {
      where.dueAt = { lt: new Date() };
      where.status = { in: ["TODO", "IN_PROGRESS"] };
    } else if (dueDate === "today") {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.dueAt = { gte: today, lt: tomorrow };
    } else if (dueDate === "week") {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      where.dueAt = { gte: today, lte: nextWeek };
    }

    // Manager-scoped visibility: non-admins see only their own + direct reports' tasks
    if (userId) {
      const visibleUserIds = await getVisibleUserIds(userId, orgId);
      if (visibleUserIds) {
        where.OR = [
          { assigneeId: { in: visibleUserIds } },
          { assigneeId: null }, // Unassigned tasks visible to managers
        ];
      }
    }

    const [tasks, totalCount] = await Promise.all([
      prisma.tasks.findMany({
        where,
        include: {
          projects: {
            select: {
              title: true,
              jobNumber: true,
              properties: {
                select: {
                  street: true,
                  city: true,
                },
              },
            },
          },
          users: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "asc" }],
        take: limit,
        skip: offset,
      }),
      prisma.tasks.count({ where }),
    ]);

    return Response.json({
      tasks,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    // Check if this is a permission error
    if (error instanceof Error && error.message.includes("Permission denied")) {
      logger.warn("[Tasks API] Permission denied:", error.message);
      return Response.json(
        { error: "You don't have permission to view tasks. Please contact your administrator." },
        { status: 403 }
      );
    }
    logger.error("Error fetching tasks:", error);
    return Response.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest, { orgId, userId }) => {
  try {
    await requirePermission("create_tasks");

    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const {
      title,
      description,
      type,
      projectId,
      assigneeId,
      dueAt,
      priority,
      status,
      contactId,
      leadId,
      claimId,
      inspectionId,
      notes,
    } = parsed.data;

    const task = await prisma.tasks.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        title,
        description,
        type,
        projectId,
        assigneeId: assigneeId || userId,
        dueAt: dueAt ? new Date(dueAt) : null,
        priority,
        status,
        contactId,
        leadId,
        claimId,
        inspectionId,
        notes,
        updatedAt: new Date(),
      },
      include: {
        projects: {
          select: {
            title: true,
            jobNumber: true,
          },
        },
        users: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Create activity
    await prisma.activities.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        projectId,
        type: "task_created",
        title: "Task Created",
        description: `Task "${title}" was created`,
        userId,
        userName: "System",
        updatedAt: new Date(),
      },
    });

    // ── Log to Claim Timeline (Pro-Only) ───────────────────────────
    if (claimId) {
      try {
        const { nanoid } = await import("nanoid");
        await prisma.claim_timeline_events.create({
          data: {
            id: nanoid(),
            claim_id: claimId,
            type: "task_created",
            description: `Task created: "${title}"${description ? ` — ${description}` : ""}`,
            actor_id: userId,
            visible_to_client: false, // Pro-only, never shown to clients
            metadata: {
              title: `Task Created: ${title}`,
              taskId: task.id,
              priority,
              status,
              dueAt: dueAt || null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as unknown as any,
          },
        });
        logger.debug(`[POST /api/tasks] Logged task to claim timeline for claim ${claimId}`);
      } catch (timelineError) {
        // Timeline logging failure should NOT block task creation
        logger.warn("[POST /api/tasks] Failed to log task to claim timeline:", timelineError);
      }
    }

    // ── Sprint 27: Send TASK_ASSIGNED notification ───────────────
    const effectiveAssignee = assigneeId || userId;
    if (effectiveAssignee && effectiveAssignee !== userId) {
      // Only notify if the task is assigned to someone OTHER than the creator
      try {
        await sendTemplatedNotification("TASK_ASSIGNED", effectiveAssignee, {
          taskName: title,
          taskId: task.id,
          projectId: projectId || null,
          assignedBy: userId,
        });
        logger.info(
          `[POST /api/tasks] TASK_ASSIGNED notification sent to ${effectiveAssignee} for task "${title}"`
        );
      } catch (notifError) {
        // Notification failure should NOT block task creation
        logger.error("[POST /api/tasks] Failed to send TASK_ASSIGNED notification:", notifError);
      }
    }

    return Response.json(task, { status: 201 });
  } catch (error) {
    logger.error("Error creating tasks:", error);
    return Response.json({ error: "Failed to create tasks" }, { status: 500 });
  }
});
