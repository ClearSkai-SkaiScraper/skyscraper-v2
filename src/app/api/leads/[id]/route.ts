/**
 * Individual Lead Management API
 *
 * GET    /api/leads/[id] - Get single lead details
 * PATCH  /api/leads/[id] - Update lead
 * DELETE /api/leads/[id] - Delete lead
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { compose, withRateLimit, withSentryApi } from "@/lib/api/wrappers";
import { logger } from "@/lib/logger";
import { notifyManagersOfSubmission } from "@/lib/notifications/notifyManagers";
import { getCurrentUserPermissions, requirePermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";

// Prisma singleton imported from @/lib/db/prisma

// Zod schema for PATCH validation — only allow known fields
const updateLeadSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    source: z.string().optional(),
    value: z.number().optional(),
    probability: z.number().min(0).max(100).optional(),
    stage: z.string().optional(),
    temperature: z.enum(["hot", "warm", "cold"]).optional(),
    assignedTo: z.string().optional(),
    followUpDate: z.string().nullable().optional(),
    jobCategory: z.string().optional(),
    clientId: z.string().optional(),
    estimatedJobValue: z.number().optional(),
    jobValueStatus: z.enum(["draft", "submitted", "approved", "rejected"]).optional(),
    jobValueApprovalNotes: z.string().optional(),
  })
  .strict();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/leads/[id] - Get single lead with full details
 */
const baseGET = async (request: Request, { params }: { params: { id: string } }) => {
  try {
    await requirePermission("view_projects");
    const { orgId } = await getCurrentUserPermissions();

    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const lead = await prisma.leads.findFirst({
      where: {
        id: params.id,
        orgId,
      },
      include: {
        contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        users_leads_assignedToTousers: {
          select: {
            id: true,
            email: true,
            clerkUserId: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    logger.error(`[GET /api/leads/${params.id}] Error:`, error);
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
};

/**
 * PATCH /api/leads/[id] - Update lead
 */
const basePATCH = async (request: Request, { params }: { params: { id: string } }) => {
  try {
    await requirePermission("edit_projects");
    const { orgId, userId } = await getCurrentUserPermissions();

    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Verify lead exists and belongs to org
    const existingLead = await prisma.leads.findFirst({
      where: {
        id: params.id,
        orgId,
      },
    });

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const rawBody = await request.json();

    // Validate input with Zod — reject unknown fields
    const validation = updateLeadSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = validation.data;

    const {
      title,
      description,
      source,
      value,
      probability,
      stage,
      temperature,
      assignedTo,
      followUpDate,
      jobCategory,
      clientId,
      estimatedJobValue,
      jobValueStatus,
      jobValueApprovalNotes,
    } = body;

    // Verify assignedTo user belongs to the same org if provided
    if (assignedTo) {
      const memberCheck = await prisma.user_organizations.findFirst({
        where: { userId: assignedTo, organizationId: orgId },
      });
      if (!memberCheck) {
        return NextResponse.json(
          { error: "Assigned user does not belong to this organization" },
          { status: 400 }
        );
      }
    }

    // Verify contactId belongs to the same org if provided
    if (clientId) {
      // clientId on leads is a free-text field, but if it looks like a contactId, verify ownership
      const contactCheck = await prisma.contacts.findFirst({
        where: { id: clientId, orgId },
      });
      // Only block if it looks like a structured ID but doesn't belong to org
      if (!contactCheck && clientId.length > 10) {
        logger.warn(
          `[PATCH /api/leads/${params.id}] clientId ${clientId} not found in org ${orgId}`
        );
      }
    }

    // Build update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (source !== undefined) updateData.source = source;
    if (value !== undefined) updateData.value = value;
    if (probability !== undefined) updateData.probability = probability;
    if (stage !== undefined) updateData.stage = stage;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (followUpDate !== undefined)
      updateData.followUpDate = followUpDate ? new Date(followUpDate) : null;
    if (jobCategory !== undefined) updateData.jobCategory = jobCategory;
    if (clientId !== undefined) updateData.clientId = clientId;

    // Job value estimation fields — auto-set audit trail server-side
    if (estimatedJobValue !== undefined) {
      updateData.estimatedJobValue = estimatedJobValue;
      updateData.jobValueSubmittedBy = userId || "system";
      updateData.jobValueSubmittedAt = new Date();
    }
    if (jobValueStatus !== undefined) {
      updateData.jobValueStatus = jobValueStatus;
      if (jobValueStatus === "approved") {
        updateData.jobValueApprovedBy = userId || "system";
        updateData.jobValueApprovedAt = new Date();
      }
    }
    if (jobValueApprovalNotes !== undefined) {
      updateData.jobValueApprovalNotes = jobValueApprovalNotes;
    }

    // Track stage changes for activity logging
    const stageChanged = stage && stage !== existingLead.stage;
    const previousStage = existingLead.stage;

    // Update the lead
    const lead = await prisma.leads.update({
      where: { id: params.id },
      data: updateData,
      include: {
        contacts: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
          },
        },
      },
    });

    // Notify managers when a job value is submitted for approval
    if (jobValueStatus === "submitted" && estimatedJobValue) {
      void notifyManagersOfSubmission({
        orgId: orgId!,
        submittedByUserId: userId || "system",
        entityType: "lead",
        entityId: params.id,
        entityTitle: lead.title || "Lead",
        estimatedValue: estimatedJobValue,
      });
    }

    // Log activity if stage changed
    if (stageChanged) {
      try {
        await prisma.activities.create({
          data: {
            id: crypto.randomUUID(),
            orgId,
            leadId: lead.id,
            contactId: lead.contactId,
            type: "lead_stage_changed",
            title: "Lead Stage Changed",
            description: `Lead "${lead.title}" moved from ${previousStage} to ${stage}`,
            userId: userId || "system",
            userName: "System",
            metadata: {
              previousStage,
              newStage: stage,
            },
            updatedAt: new Date(),
          },
        });
      } catch (activityError) {
        logger.warn("[PATCH /api/leads/[id]] Failed to create activity:", activityError);
        // Don't fail the request
      }
    } else if (Object.keys(updateData).length > 0) {
      // Log general update activity
      try {
        await prisma.activities.create({
          data: {
            id: crypto.randomUUID(),
            orgId,
            leadId: lead.id,
            contactId: lead.contactId,
            type: "lead_updated",
            title: "Lead Updated",
            description: `Lead "${lead.title}" was updated`,
            userId: userId || "system",
            userName: "System",
            updatedAt: new Date(),
          },
        });
      } catch (activityError) {
        logger.warn("[PATCH /api/leads/[id]] Failed to create activity:", activityError);
      }
    }

    return NextResponse.json({ lead });
  } catch (error) {
    logger.error(`[PATCH /api/leads/${params.id}] Error:`, error);

    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "A lead with this information already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }

    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
};

/**
 * DELETE /api/leads/[id] - Delete lead (soft delete)
 */
const baseDELETE = async (request: Request, { params }: { params: { id: string } }) => {
  try {
    await requirePermission("delete_projects");
    const { orgId, userId } = await getCurrentUserPermissions();

    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Verify lead exists and belongs to org
    const lead = await prisma.leads.findFirst({
      where: {
        id: params.id,
        orgId,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Check if lead has been converted to a project
    const hasProject = await prisma.projects.findFirst({
      where: { leadId: lead.id },
    });

    if (hasProject) {
      return NextResponse.json(
        { error: "Cannot delete lead that has been converted to a project" },
        { status: 400 }
      );
    }

    // Soft delete by updating stage to "lost"
    await prisma.leads.update({
      where: { id: params.id },
      data: {
        stage: "lost",
        closedAt: new Date(),
      },
    });

    // Log activity
    try {
      await prisma.activities.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          leadId: lead.id,
          contactId: lead.contactId,
          type: "lead_deleted",
          title: "Lead Deleted",
          description: `Lead "${lead.title}" was marked as lost`,
          userId: userId || "system",
          userName: "System",
          updatedAt: new Date(),
        },
      });
    } catch (activityError) {
      logger.warn("[DELETE /api/leads/[id]] Failed to create activity:", activityError);
    }

    return NextResponse.json({
      success: true,
      description: "Lead deleted successfully",
    });
  } catch (error) {
    logger.error(`[DELETE /api/leads/${params.id}] Error:`, error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
};

// NOTE: withOrgScope requires x-org-id header which client-side forms don't send.
// All handlers already resolve org via Clerk's getCurrentUserPermissions(), so
// we only need Sentry + rate-limiting here.
const wrap = compose(withSentryApi, withRateLimit);
export const GET = wrap(baseGET);
export const PATCH = wrap(basePATCH);
export const DELETE = wrap(baseDELETE);
