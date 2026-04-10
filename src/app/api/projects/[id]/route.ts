export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest } from "next/server";

import { onStageChange } from "@/lib/automation";
import { logger } from "@/lib/logger";
import { getCurrentUserPermissions, requirePermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";

// Prisma singleton imported from @/lib/db/prisma

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePermission("view_projects");
    const { orgId } = await getCurrentUserPermissions();

    if (!orgId) {
      return Response.json({ error: "Organization not found" }, { status: 404 });
    }

    const project = await prisma.projects.findFirst({
      where: {
        id: params.id,
        orgId,
      },
      include: {
        contacts: true,
        properties: true,
        leads: true,
        users_projects_assignedToTousers: true,
        users_projects_createdByTousers: true,
        inspections: {
          orderBy: { scheduledAt: "desc" },
          take: 5,
        },
        estimates: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        claims: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        documents: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        tasks: {
          where: { status: { in: ["TODO", "IN_PROGRESS"] } },
          orderBy: { dueAt: "asc" },
          take: 10,
          include: {
            users: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    return Response.json(project);
  } catch (error) {
    logger.error("Error fetching project:", error);
    return Response.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePermission("edit_projects");
    const { orgId, userId } = await getCurrentUserPermissions();

    if (!orgId || !userId) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      status,
      startDate,
      targetEndDate,
      actualEndDate,
      assignedTo,
      valueEstimate,
      notes,
    } = body;

    // Get current project for comparison
    const currentProject = await prisma.projects.findFirst({
      where: { id: params.id, orgId },
    });

    if (!currentProject) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Update the project
    const project = await prisma.projects.update({
      where: { id: params.id },
      data: {
        title,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        targetEndDate: targetEndDate ? new Date(targetEndDate) : undefined,
        actualEndDate: actualEndDate ? new Date(actualEndDate) : undefined,
        assignedTo,
        valueEstimate,
        notes,
      },
      include: {
        contacts: true,
        properties: true,
        leads: true,
        users_projects_assignedToTousers: true,
        users_projects_createdByTousers: true,
      },
    });

    // Create activity for the update
    await prisma.activities.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        projectId: project.id,
        type: "project_updated",
        title: "Project Updated",
        description: `Project "${project.title}" was updated`,
        userId,
        userName: "System",
        updatedAt: new Date(),
      },
    });

    // Trigger stage change automation if status changed
    if (status && status !== currentProject.status) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await onStageChange(project.id, status, currentProject.status as any, userId);
    }

    return Response.json(project);
  } catch (error) {
    logger.error("Error updating project:", error);
    return Response.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePermission("delete_projects");
    const { orgId, userId } = await getCurrentUserPermissions();

    if (!orgId || !userId) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const project = await prisma.projects.findFirst({
      where: { id: params.id, orgId },
    });

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Soft delete by updating status
    await prisma.projects.update({
      where: { id: params.id },
      data: {
        status: "ARCHIVED",
        notes: project.notes
          ? `${project.notes}\n\nArchived on ${new Date().toISOString()}`
          : `Archived on ${new Date().toISOString()}`,
      },
    });

    // Create activity
    await prisma.activities.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        projectId: project.id,
        type: "project_archived",
        title: "Project Archived",
        description: `Project "${project.title}" was archived`,
        userId,
        userName: "System",
        updatedAt: new Date(),
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.error("Error archiving project:", error);
    return Response.json({ error: "Failed to archive project" }, { status: 500 });
  }
}
