export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { onStageChange } from "@/lib/automation";
import { logger } from "@/lib/logger";
import { getCurrentUserPermissions, requirePermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validation/middleware";
import { createProjectSchema } from "@/lib/validation/pipeline-schemas";

// Prisma singleton imported from @/lib/db/prisma

export async function GET(request: NextRequest) {
  try {
    await requirePermission("view_projects");
    const { orgId } = await getCurrentUserPermissions();

    if (!orgId) {
      return Response.json({ error: "Organization not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assignedTo");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = { orgId };
    if (status) where.status = status;
    if (assignedTo) where.assignedTo = assignedTo;

    const [projects, totalCount] = await Promise.all([
      prisma.projects.findMany({
        where,
        include: {
          contacts: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          properties: {
            select: {
              street: true,
              city: true,
              state: true,
              zipCode: true,
            },
          },
          leads: {
            select: {
              source: true,
              stage: true,
            },
          },
          users_projects_assignedToTousers: {
            select: {
              name: true,
              email: true,
            },
          },
          users_projects_createdByTousers: {
            select: {
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              documents: true,
              estimates: true,
              claims: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.projects.count({ where }),
    ]);

    return Response.json({
      projects,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    logger.error("Error fetching projects:", error);
    return Response.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission("create_projects");
    const { orgId, userId } = await getCurrentUserPermissions();

    if (!orgId || !userId) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await validateBody(request, createProjectSchema);
    if (body instanceof NextResponse) return body;
    const {
      title,
      leadId,
      propertyId,
      contactId,
      status,
      startDate,
      targetEndDate,
      assignedTo,
      valueEstimate,
      notes,
    } = body;

    // Generate job number
    const jobCount = await prisma.projects.count({ where: { orgId } });
    const jobNumber = `P${String(jobCount + 1).padStart(6, "0")}`;

    // Create project + initial activity in a single transaction
    const project = await prisma.$transaction(async (tx) => {
      const proj = await tx.projects.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          title,
          jobNumber,
          leadId,
          propertyId,
          contactId,
          status: status || "LEAD",
          startDate: startDate ? new Date(startDate) : null,
          targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
          createdBy: userId,
          assignedTo: assignedTo || userId,
          valueEstimate,
          notes,
          updatedAt: new Date(),
        },
        include: {
          contacts: true,
          properties: true,
          leads: true,
          users_projects_assignedToTousers: true,
          users_projects_createdByTousers: true,
        },
      });

      await tx.activities.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          projectId: proj.id,
          type: "project_created",
          title: "Project Created",
          description: `Project "${title}" was created`,
          userId,
          userName: "System",
          updatedAt: new Date(),
        },
      });

      return proj;
    });

    // Trigger stage change automation
    await onStageChange(project.id, status as any, undefined, userId);

    return Response.json(project, { status: 201 });
  } catch (error) {
    logger.error("Error creating project:", error);
    return Response.json({ error: "Failed to create project" }, { status: 500 });
  }
}
