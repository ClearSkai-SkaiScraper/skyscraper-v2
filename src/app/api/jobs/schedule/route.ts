import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateContactSlug } from "@/lib/generateContactSlug";
import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";

const scheduleJobSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  type: z.string().trim().min(1, "Job type is required"),
  scheduledDate: z.string().trim().min(1, "Scheduled date is required"),
  startTime: z.string().trim().nullish(),
  endTime: z.string().trim().nullish(),
  address: z.string().trim().nullish(),
  claimId: z.string().trim().nullish(),
  propertyId: z.string().trim().nullish(),
  assignedTo: z.string().trim().nullish(),
  crewSize: z.union([z.string(), z.number()]).nullish(),
  notes: z.string().trim().max(5000).nullish(),
});

export const dynamic = "force-dynamic";

/**
 * GET /api/jobs/schedule
 * Fetch scheduled jobs with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error || ctx.reason }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Record<string, unknown> = {
      orgId: ctx.orgId,
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (type && type !== "all") {
      where.jobType = type;
    }

    if (dateFrom || dateTo) {
      where.scheduledStart = {};
      if (dateFrom) {
        (where.scheduledStart as Record<string, Date>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.scheduledStart as Record<string, Date>).lte = new Date(dateTo);
      }
    }

    // Fetch jobs with relations
    const jobs = await prisma.jobs.findMany({
      where,
      orderBy: { scheduledStart: "asc" },
      include: {
        claims: {
          select: {
            id: true,
            claimNumber: true,
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
      },
    });

    // Helper to format address from property fields
    const formatAddress = (
      prop: { street: string; city: string; state: string; zipCode: string } | null | undefined
    ) => {
      if (!prop) return null;
      return `${prop.street}, ${prop.city}, ${prop.state} ${prop.zipCode}`;
    };

    // Transform to scheduled job format
    const scheduledJobs = jobs.map((job) => ({
      id: job.id,
      title: job.title || `Job ${job.id.slice(-6)}`,
      type: job.jobType || "inspection",
      status: job.status,
      scheduledDate: job.scheduledStart,
      startTime: job.scheduledStart,
      endTime: job.scheduledEnd,
      address:
        formatAddress(job.claims?.properties) || formatAddress(job.properties) || "No address",
      claimId: job.claimId,
      claimNumber: job.claims?.claimNumber,
      propertyId: job.propertyId,
      assignedTo: job.foreman,
      estimatedDuration: null,
      notes: job.description,
      crewSize: job.crewSize,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      jobs: scheduledJobs,
    });
  } catch (error) {
    logger.error("Failed to fetch scheduled jobs:", error);
    return NextResponse.json({ error: "Failed to fetch scheduled jobs" }, { status: 500 });
  }
}

/**
 * POST /api/jobs/schedule
 * Create a new scheduled job
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error || ctx.reason }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = scheduleJobSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const {
      title,
      type,
      scheduledDate,
      startTime,
      endTime,
      address,
      claimId,
      propertyId,
      assignedTo,
      crewSize,
      notes,
    } = parsed.data;

    // If no propertyId provided, try to get from claim or create placeholder
    let resolvedPropertyId = propertyId;
    if (!resolvedPropertyId && claimId) {
      const claim = await prisma.claims.findFirst({
        where: { id: claimId, orgId: ctx.orgId },
        select: { propertyId: true },
      });
      resolvedPropertyId = claim?.propertyId;
    }

    // If still no property, we need one - find or create a default
    if (!resolvedPropertyId) {
      const existingProperty = await prisma.properties.findFirst({
        where: { orgId: ctx.orgId },
        select: { id: true },
      });

      if (existingProperty) {
        resolvedPropertyId = existingProperty.id;
      } else {
        // We need a contact to create a property - find or create one
        let contactId: string;
        const existingContact = await prisma.contacts.findFirst({
          where: { orgId: ctx.orgId },
          select: { id: true },
        });

        if (existingContact) {
          contactId = existingContact.id;
        } else {
          const newContact = await prisma.contacts.create({
            data: {
              id: crypto.randomUUID(),
              orgId: ctx.orgId,
              firstName: "Default",
              lastName: "Contact",
              slug: generateContactSlug("Default", "Contact"),
              updatedAt: new Date(),
            },
          });
          contactId = newContact.id;
        }

        // Create a placeholder property with required fields
        const newProperty = await prisma.properties.create({
          data: {
            id: crypto.randomUUID(),
            orgId: ctx.orgId,
            contactId,
            name: address || "TBD Property",
            propertyType: "residential",
            street: address || "TBD",
            city: "TBD",
            state: "TBD",
            zipCode: "00000",
            updatedAt: new Date(),
          },
        });
        resolvedPropertyId = newProperty.id;
      }
    }

    // Create the job
    const job = await prisma.jobs.create({
      data: {
        id: crypto.randomUUID(),
        orgId: ctx.orgId,
        propertyId: resolvedPropertyId,
        title,
        jobType: type,
        status: "scheduled",
        scheduledStart: startTime ? new Date(startTime) : new Date(scheduledDate),
        scheduledEnd: endTime ? new Date(endTime) : undefined,
        claimId: claimId || undefined,
        foreman: assignedTo || undefined,
        crewSize: crewSize != null ? Number(crewSize) : undefined,
        description: notes || undefined,
        updatedAt: new Date(),
      },
    });

    // Log activity
    await prisma.activities.create({
      data: {
        id: crypto.randomUUID(),
        orgId: ctx.orgId,
        type: "job_scheduled",
        title: `Job Scheduled: ${title}`,
        description: `New ${type} job scheduled for ${new Date(scheduledDate).toLocaleDateString()}`,
        userId: ctx.userId,
        userName: "System",
        jobId: job.id,
        claimId: claimId || undefined,
        metadata: {
          jobType: type,
          scheduledDate,
          assignedTo,
        },
        updatedAt: new Date(),
      },
    });

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
    logger.error("Failed to create scheduled job:", error);
    return NextResponse.json({ error: "Failed to create scheduled job" }, { status: 500 });
  }
}
