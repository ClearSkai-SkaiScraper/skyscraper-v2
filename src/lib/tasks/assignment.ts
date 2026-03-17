/**
 * Task Assignment System
 *
 * Assign tasks to team members
 * Track progress, deadlines, priorities
 */

import type {
  TaskPriority as PrismaTaskPriority,
  tasks as PrismaTask,
  TaskStatus as PrismaTaskStatus,
} from "@prisma/client";
import { randomUUID } from "crypto";

import { logActivity } from "@/lib/activity/activityFeed";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type TaskPriority = PrismaTaskPriority;
export type TaskStatus = PrismaTaskStatus;
export type Task = PrismaTask;

/**
 * Create task
 */
export async function createTask(
  orgId: string,
  data: {
    title: string;
    description?: string;
    assignedTo: string;
    assignedBy: string;
    priority?: TaskPriority;
    dueDate?: Date;
    relatedTo?: { type: "CLAIM" | "JOB" | "INSPECTION" | "LEAD" | "CONTACT"; id: string };
  }
): Promise<Task> {
  try {
    const taskId = randomUUID();
    const task = await prisma.tasks.create({
      data: {
        id: taskId,
        orgId,
        title: data.title,
        description: data.description,
        status: "TODO",
        priority: data.priority ?? "MEDIUM",
        assigneeId: data.assignedTo,
        dueAt: data.dueDate,
        claimId: data.relatedTo?.type === "CLAIM" ? data.relatedTo.id : undefined,
        projectId: data.relatedTo?.type === "JOB" ? data.relatedTo.id : undefined,
        inspectionId: data.relatedTo?.type === "INSPECTION" ? data.relatedTo.id : undefined,
        leadId: data.relatedTo?.type === "LEAD" ? data.relatedTo.id : undefined,
        contactId: data.relatedTo?.type === "CONTACT" ? data.relatedTo.id : undefined,
        updatedAt: new Date(),
      },
    });

    // Log activity
    await logActivity(orgId, {
      userId: data.assignedBy,
      type: "CREATED",
      resourceType: "TASK",
      resourceId: task.id,
      action: "Task Created",
      description: `Created task: ${data.title}`,
    });

    // Notify assignee
    const { sendTemplatedNotification } = await import("../notifications/templates");

    await sendTemplatedNotification("TASK_ASSIGNED", data.assignedTo, {
      firstName: await getUserFirstName(data.assignedTo),
      taskTitle: data.title,
      dueDate: data.dueDate?.toLocaleDateString() || "No deadline",
      priority: data.priority ?? "MEDIUM",
    });

    return task;
  } catch (error) {
    logger.error("Failed to create task:", error);
    throw new Error("Failed to create task");
  }
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  userId: string
): Promise<boolean> {
  try {
    const task = await prisma.tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) return false;

    await prisma.tasks.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === "DONE" ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    // Log activity
    await logActivity(task.orgId, {
      userId,
      type: "UPDATED",
      resourceType: "TASK",
      resourceId: taskId,
      action: "Status Changed",
      description: `Task status changed to ${status}`,
    });

    return true;
  } catch (error) {
    logger.error("Failed to update task status:", error);
    return false;
  }
}

/**
 * Get user tasks
 */
export async function getUserTasks(
  userId: string,
  filters?: {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    overdue?: boolean;
  }
): Promise<Task[]> {
  try {
    const where: any = {
      assigneeId: userId,
    };

    if (filters?.status) {
      where.status = { in: filters.status };
    }

    if (filters?.priority) {
      where.priority = { in: filters.priority };
    }

    if (filters?.overdue) {
      where.dueAt = { lt: new Date() };
      where.status = { not: "DONE" };
    }

    const tasks = await prisma.tasks.findMany({
      where,
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
    });

    return tasks as Task[];
  } catch {
    return [];
  }
}

/**
 * Get team tasks
 */
export async function getTeamTasks(
  orgId: string,
  filters?: {
    assignedTo?: string[];
    status?: TaskStatus[];
    relatedTo?: { type: "CLAIM" | "JOB" | "INSPECTION" | "LEAD" | "CONTACT"; id: string };
  }
): Promise<Task[]> {
  try {
    const where: any = {
      orgId,
    };

    if (filters?.assignedTo) {
      where.assigneeId = { in: filters.assignedTo };
    }

    if (filters?.status) {
      where.status = { in: filters.status };
    }

    if (filters?.relatedTo) {
      if (filters.relatedTo.type === "CLAIM") where.claimId = filters.relatedTo.id;
      if (filters.relatedTo.type === "JOB") where.projectId = filters.relatedTo.id;
      if (filters.relatedTo.type === "INSPECTION") where.inspectionId = filters.relatedTo.id;
      if (filters.relatedTo.type === "LEAD") where.leadId = filters.relatedTo.id;
      if (filters.relatedTo.type === "CONTACT") where.contactId = filters.relatedTo.id;
    }

    const tasks = await prisma.tasks.findMany({
      where,
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
    });

    return tasks as Task[];
  } catch {
    return [];
  }
}

/**
 * Reassign task
 */
export async function reassignTask(
  taskId: string,
  newAssignee: string,
  reassignedBy: string
): Promise<boolean> {
  try {
    const task = await prisma.tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) return false;

    const oldAssignee = task.assigneeId;

    await prisma.tasks.update({
      where: { id: taskId },
      data: {
        assigneeId: newAssignee,
        updatedAt: new Date(),
      },
    });

    // Log activity
    await logActivity(task.orgId, {
      userId: reassignedBy,
      type: "UPDATED",
      resourceType: "TASK",
      resourceId: taskId,
      action: "Task Reassigned",
      description: `Task reassigned from ${oldAssignee} to ${newAssignee}`,
    });

    // Notify new assignee
    const { sendTemplatedNotification } = await import("../notifications/templates");

    await sendTemplatedNotification("TASK_ASSIGNED", newAssignee, {
      firstName: await getUserFirstName(newAssignee),
      taskTitle: task.title,
      dueDate: task.dueAt?.toLocaleDateString() || "No deadline",
      priority: task.priority,
    });

    return true;
  } catch (error) {
    logger.error("Failed to reassign task:", error);
    return false;
  }
}

/**
 * Get task statistics
 */
export async function getTaskStats(userId: string): Promise<{
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
  overdue: number;
}> {
  try {
    const tasks = await prisma.tasks.findMany({
      where: { assigneeId: userId },
    });

    const now = new Date();

    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "TODO").length,
      inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      completed: tasks.filter((t) => t.status === "DONE").length,
      overdue: tasks.filter((t) => t.status !== "DONE" && t.dueAt && t.dueAt < now).length,
    };
  } catch {
    return {
      total: 0,
      todo: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
    };
  }
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(orgId: string): Promise<Task[]> {
  try {
    const tasks = await prisma.tasks.findMany({
      where: {
        orgId,
        status: { not: "DONE" },
        dueAt: { lt: new Date() },
      },
      orderBy: {
        dueAt: "asc",
      },
    });

    return tasks as Task[];
  } catch {
    return [];
  }
}

/**
 * Complete task
 */
export async function completeTask(taskId: string, userId: string): Promise<boolean> {
  return updateTaskStatus(taskId, "DONE", userId);
}

/**
 * Delete task
 */
export async function deleteTask(taskId: string, userId: string): Promise<boolean> {
  try {
    const task = await prisma.tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) return false;

    await prisma.tasks.delete({
      where: { id: taskId },
    });

    // Log activity
    await logActivity(task.orgId, {
      userId,
      type: "DELETED",
      resourceType: "TASK",
      resourceId: taskId,
      action: "Task Deleted",
      description: `Deleted task: ${task.title}`,
    });

    return true;
  } catch (error) {
    logger.error("Failed to delete task:", error);
    return false;
  }
}

/**
 * Helper: Get user first name
 */
async function getUserFirstName(userId: string): Promise<string> {
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const first = user?.name?.trim().split(/\s+/)[0];
    return first || "Team Member";
  } catch {
    return "Team Member";
  }
}

/**
 * Bulk create tasks
 */
export async function bulkCreateTasks(
  orgId: string,
  tasks: Array<{
    title: string;
    assignedTo: string;
    priority?: TaskPriority;
    dueDate?: Date;
  }>,
  assignedBy: string
): Promise<Task[]> {
  const created: Task[] = [];

  for (const taskData of tasks) {
    try {
      const task = await createTask(orgId, {
        ...taskData,
        assignedBy,
      });
      created.push(task);
    } catch (error) {
      logger.error("Failed to create task:", error);
    }
  }

  return created;
}
