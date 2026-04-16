export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import { requirePermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";

/**
 * Retail Jobs API
 *
 * Retail jobs are stored in the `leads` table with jobCategory
 * set to "out_of_pocket", "financed", or "repair".
 * This API provides CRUD operations for retail jobs.
 */

const createRetailJobSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  jobCategory: z.enum(["out_of_pocket", "financed", "repair"]),
  workType: z.string().optional(),
  urgency: z.enum(["low", "medium", "high", "urgent"]).optional(),
  budget: z.number().optional(),
  contactId: z.string().optional(),
  contactData: z
    .object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
    })
    .optional(),
});

export const POST = withOrgScope(async (request, { userId, orgId }) => {
  try {
    // Enforce RBAC — require permission to create leads/retail jobs
    await requirePermission("create_projects");

    const body = await request.json();
    const validation = createRetailJobSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Create or find contact
    let contactId = data.contactId;

    // If contactId is provided, verify it belongs to this org
    if (contactId) {
      const contactCheck = await prisma.contacts.findFirst({
        where: { id: contactId, orgId },
      });
      if (!contactCheck) {
        return Response.json({ error: "Contact not found in your organization" }, { status: 404 });
      }
    }

    if (!contactId && data.contactData) {
      const contact = await prisma.contacts.create({
        data: {
          id: createId(),
          orgId,
          firstName: data.contactData.firstName,
          lastName: data.contactData.lastName,
          email: data.contactData.email,
          phone: data.contactData.phone,
          street: data.contactData.street,
          city: data.contactData.city,
          state: data.contactData.state,
          zipCode: data.contactData.zipCode,
          source: "RETAIL_JOB",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      contactId = contact.id;
    }

    if (!contactId) {
      return Response.json({ error: "Contact information required" }, { status: 400 });
    }

    // Create the retail job as a lead
    const retailJob = await prisma.leads.create({
      data: {
        id: createId(),
        orgId,
        contactId,
        title: data.title,
        description: data.description,
        source: "direct",
        stage: "new",
        temperature: data.urgency === "urgent" ? "hot" : data.urgency === "high" ? "warm" : "cold",
        jobCategory: data.jobCategory,
        jobType: "RETAIL",
        workType: data.workType,
        urgency: data.urgency,
        budget: data.budget,
        createdBy: userId,
        updatedAt: new Date(),
      },
      include: {
        contacts: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
    });

    logger.info("[RETAIL_JOBS] Created retail job", { orgId, jobId: retailJob.id });

    return Response.json({ success: true, retailJob }, { status: 201 });
  } catch (error) {
    logger.error("[RETAIL_JOBS] Error creating retail job:", error);
    return Response.json({ error: "Failed to create retail job" }, { status: 500 });
  }
});

export const GET = withOrgScope(async (request, { userId, orgId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const stage = searchParams.get("stage");
    const limit = parseInt(searchParams.get("limit") || "50");

    const retailJobs = await prisma.leads.findMany({
      where: {
        orgId,
        jobCategory: category
          ? { equals: category }
          : { in: ["out_of_pocket", "financed", "repair"] },
        ...(stage ? { stage } : {}),
      },
      include: {
        contacts: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return Response.json({ retailJobs, count: retailJobs.length });
  } catch (error) {
    logger.error("[RETAIL_JOBS] Error fetching retail jobs:", error);
    return Response.json({ error: "Failed to fetch retail jobs" }, { status: 500 });
  }
});
