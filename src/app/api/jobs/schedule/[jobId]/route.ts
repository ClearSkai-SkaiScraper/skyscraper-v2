import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /api/jobs/schedule/[jobId]
 * Get a specific scheduled job with details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.reason }, { status: 401 });
    }

    const { jobId } = await params;

    const job = await prisma.jobs.findFirst({
      where: {
        id: jobId,
        orgId: ctx.orgId,
      },
      include: {
        claims: {
          select: {
            id: true,
            claimNumber: true,
            insured_name: true,
            properties: {
              select: {
                street: true,
                city: true,
                state: true,
                zipCode: true,
              },
            },
          },
        },
        properties: {
          select: {
            id: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        activities: {
          where: { type: { startsWith: "job_" } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Helper to format address from property fields
    const formatAddress = (
      prop: { street: string; city: string; state: string; zipCode: string } | null | undefined
    ) => (prop ? `${prop.street}, ${prop.city}, ${prop.state} ${prop.zipCode}` : null);

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        title: job.title,
        type: job.jobType,
        status: job.status,
        scheduledDate: job.scheduledStart,
        startTime: job.scheduledStart,
        endTime: job.scheduledEnd,
        address: formatAddress(job.claims?.properties) || formatAddress(job.properties),
        claim: job.claims,
        property: job.properties,
        assignedTo: job.foreman,
        crewSize: job.crewSize,
        notes: job.description,
        activities: job.activities,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch job:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

/**
 * PATCH /api/jobs/schedule/[jobId]
 * Update a scheduled job
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.reason }, { status: 401 });
    }

    const { jobId } = await params;
    const body = await request.json();

    // Check job exists
    const existingJob = await prisma.jobs.findFirst({
      where: {
        id: jobId,
        orgId: ctx.orgId,
      },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const { title, type, status, scheduledDate, startTime, endTime, assignedTo, crewSize, notes } =
      body;

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (type !== undefined) updateData.jobType = type;
    if (status !== undefined) updateData.status = status;
    if (scheduledDate !== undefined || startTime !== undefined) {
      updateData.scheduledStart = new Date(startTime || scheduledDate);
    }
    if (endTime !== undefined) {
      updateData.scheduledEnd = endTime ? new Date(endTime) : null;
    }
    if (assignedTo !== undefined) updateData.foreman = assignedTo;
    if (crewSize !== undefined) updateData.crewSize = crewSize ? parseInt(crewSize) : null;
    if (notes !== undefined) updateData.description = notes;

    const job = await prisma.jobs.update({
      where: { id: jobId },
      data: updateData,
    });

    // Log activity for status changes
    if (status && status !== existingJob.status) {
      await prisma.activities.create({
        data: {
          id: crypto.randomUUID(),
          orgId: ctx.orgId,
          type: `job_${status}`,
          title: `Job Status Updated: ${status}`,
          description: `Job "${job.title}" status changed from ${existingJob.status} to ${status}`,
          userId: ctx.userId,
          userName: "System",
          jobId: job.id,
          claimId: job.claimId || undefined,
          metadata: {
            previousStatus: existingJob.status,
            newStatus: status,
          },
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        title: job.title,
        type: job.jobType,
        status: job.status,
        scheduledDate: job.scheduledStart,
      },
    });
  } catch (error) {
    logger.error("Failed to update job:", error);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

/**
 * DELETE /api/jobs/schedule/[jobId]
 * Delete (cancel) a scheduled job
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.reason }, { status: 401 });
    }

    const { jobId } = await params;

    const job = await prisma.jobs.findFirst({
      where: {
        id: jobId,
        orgId: ctx.orgId,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Soft delete - mark as cancelled
    await prisma.jobs.update({
      where: { id: jobId },
      data: {
        status: "cancelled",
        updatedAt: new Date(),
      },
    });

    // Log activity
    await prisma.activities.create({
      data: {
        id: crypto.randomUUID(),
        orgId: ctx.orgId,
        type: "job_cancelled",
        title: `Job Cancelled: ${job.title}`,
        description: `Job "${job.title}" was cancelled`,
        userId: ctx.userId,
        userName: "System",
        jobId: job.id,
        claimId: job.claimId || undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Job cancelled successfully",
    });
  } catch (error) {
    logger.error("Failed to cancel job:", error);
    return NextResponse.json({ error: "Failed to cancel job" }, { status: 500 });
  }
}
