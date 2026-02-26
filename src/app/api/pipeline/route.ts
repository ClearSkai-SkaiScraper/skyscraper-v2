import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { onStageChange } from "@/lib/automation";
import { getUserName } from "@/lib/clerk-utils";
import { getCurrentUserPermissions, requirePermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validation/middleware";
import { moveStageSchema } from "@/lib/validation/pipeline-schemas";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Prisma singleton imported from @/lib/db/prisma

export async function GET(request: NextRequest) {
  try {
    await requirePermission("view_projects");
    const { orgId } = await getCurrentUserPermissions();

    if (!orgId) {
      return Response.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get all projects grouped by stage
    const projects = await prisma.projects.findMany({
      where: {
        orgId,
        status: { not: "ARCHIVED" }, // Exclude archived projects
      },
      include: {
        contacts: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        properties: {
          select: {
            street: true,
            city: true,
            state: true,
          },
        },
        users_projects_assignedToTousers: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: {
              where: { status: { in: ["TODO", "IN_PROGRESS"] } },
            },
            documents: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Group projects by stage
    const stages = [
      "LEAD",
      "QUALIFIED",
      "INSPECTION_SCHEDULED",
      "INSPECTED",
      "ESTIMATE_SENT",
      "INSURANCE_CLAIM",
      "APPROVED",
      "PRODUCTION",
      "FINAL_QA",
      "INVOICED",
      "PAID",
      "WARRANTY",
    ];

    const pipeline = stages.map((stage) => {
      const stageProjects = projects.filter((p) => p.status === stage);
      const totalValue = stageProjects.reduce((sum, p) => sum + (p.valueEstimate || 0), 0);

      return {
        stage,
        name: stage
          .replace(/_/g, " ")
          .toLowerCase()
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        count: stageProjects.length,
        totalValue,
        projects: stageProjects.map((project) => ({
          id: project.id,
          title: project.title,
          jobNumber: project.jobNumber,
          contactName: project.contacts
            ? `${project.contacts.firstName} ${project.contacts.lastName}`
            : "No contact",
          propertyAddress: project.properties
            ? `${project.properties.street}, ${project.properties.city}`
            : "No property",
          assigneeName: project.users_projects_assignedToTousers?.name || "Unassigned",
          valueEstimate: project.valueEstimate,
          tasksCount: project._count.tasks,
          documentsCount: project._count.documents,
          updatedAt: project.updatedAt,
          startDate: project.startDate,
          targetEndDate: project.targetEndDate,
        })),
      };
    });

    // Calculate summary stats
    const summary = {
      totalProjects: projects.length,
      totalValue: projects.reduce((sum, p) => sum + (p.valueEstimate || 0), 0),
      averageDaysInStage: 0, // NOTE: Calculate based on activity history
      stageStats: pipeline.map((stage) => ({
        stage: stage.stage,
        count: stage.count,
        value: stage.totalValue,
      })),
    };

    return Response.json({
      pipeline,
      summary,
    });
  } catch (error) {
    logger.error("Error fetching pipeline:", error);
    return Response.json({ error: "Failed to fetch pipeline" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requirePermission("edit_projects");
    const { orgId, userId } = await getCurrentUserPermissions();

    if (!orgId || !userId) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await validateBody(request, moveStageSchema);
    if (body instanceof NextResponse) return body;
    const { projectId, newStage, oldStage } = body;

    // Verify project belongs to org
    const project = await prisma.projects.findFirst({
      where: { id: projectId, orgId },
    });

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Update project stage + create activity in a single transaction
    const userName = await getUserName(userId);
    const updatedProject = await prisma.$transaction(async (tx) => {
      const updated = await tx.projects.update({
        where: { id: projectId },
        data: { status: newStage },
        include: { contacts: true, properties: true },
      });

      await tx.activities.create({
        data: {
          orgId,
          projectId,
          type: "stage_change",
          title: "Stage Changed",
          description: `Project moved from ${oldStage || project.status} to ${newStage}`,
          userId,
          userName,
        } as any,
      });

      return updated;
    });

    // Trigger automation
    await onStageChange(projectId, newStage, oldStage || project.status, userId);

    return Response.json({
      success: true,
      project: updatedProject,
    });
  } catch (error) {
    logger.error("Error updating project stage:", error);
    return Response.json({ error: "Failed to update project stage" }, { status: 500 });
  }
}
