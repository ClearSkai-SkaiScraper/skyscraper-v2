export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { z } from "zod";

import { compose, withRateLimit, withSentryApi } from "@/lib/api/wrappers";
import { apiError } from "@/lib/apiError";
import { generateContactSlug } from "@/lib/generateContactSlug";
import { autoAssignLead, geoAssignLead } from "@/lib/leads/autoAssign";
import { logInfo } from "@/lib/log";
import { logger } from "@/lib/logger";
import { getCurrentUserPermissions, requirePermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { createLead, listLeads } from "@/lib/services/leadsService";

const contactDataSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

const measurementsSchema = z.object({
  roofSquares: z.number().optional(),
  sidingLinearFeet: z.number().optional(),
  gutterLinearFeet: z.number().optional(),
  windowCount: z.number().optional(),
  doorCount: z.number().optional(),
  stories: z.number().optional(),
  pitch: z.string().optional(),
  notes: z.string().optional(),
});

const createLeadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  source: z.string().optional(),
  value: z.number().optional(),
  probability: z.number().optional(),
  stage: z.string().default("new"),
  temperature: z.string().default("warm"),
  assignedTo: z.string().optional(),
  followUpDate: z.string().optional(),
  contactId: z.string().optional(),
  contactData: contactDataSchema.optional(),
  jobType: z.string().optional(),
  workType: z.string().optional(),
  urgency: z.string().optional(),
  budget: z.number().optional(),
  jobCategory: z.string().default("lead"),
  measurements: measurementsSchema.optional(),
});

const convertLeadSchema = z.object({
  leadId: z.string().min(1),
  action: z.string().min(1),
});

// Prisma singleton imported from @/lib/db/prisma

const baseGET = async (request: Request) => {
  try {
    await requirePermission("view_projects");
    const { orgId } = await getCurrentUserPermissions();

    if (!orgId) {
      return Response.json({ error: "Organization not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const source = searchParams.get("source");
    const assignedTo = searchParams.get("assignedTo");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: any = { orgId };
    if (stage) where.stage = stage;
    if (source) where.source = source;
    if (assignedTo) where.assignedTo = assignedTo;

    const startTime = Date.now();
    const listResult = await listLeads({ orgId, stage, source, assignedTo, limit, offset });
    const listMs = Date.now() - startTime;
    logInfo("leads.list.completed", { orgId, ms: listMs, count: listResult.leads.length });
    return Response.json({
      leads: listResult.leads,
      pagination: {
        total: listResult.total,
        limit: listResult.limit,
        offset: listResult.offset,
        hasMore: listResult.offset + listResult.limit < listResult.total,
      },
    });
  } catch (error) {
    logger.error("Error fetching leads:", error);
    return apiError(500, "INTERNAL_ERROR", "Failed to fetch leads");
  }
};

const basePOST = async (request: Request) => {
  try {
    // Enforce RBAC — require permission to create leads
    await requirePermission("create_projects");

    const { orgId, userId, needsInitialization } = await getCurrentUserPermissions();

    // B-12: Strict — require orgId from session. Do NOT fall back to bare auth() pick-first-org.
    if (!orgId) {
      logger.error("[POST /api/leads] No orgId resolved from session");
      return Response.json(
        { error: "Organization not found. Please select an organization.", code: "NO_ORG" },
        { status: 403 }
      );
    }
    const effectiveOrgId = orgId;

    if (needsInitialization) {
      return Response.json(
        {
          error: "Account setup required. Please complete your profile setup first.",
          needsInitialization: true,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
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
      contactId,
      contactData,
      jobType,
      workType,
      urgency,
      budget,
      jobCategory,
      measurements,
    } = parsed.data;

    if (!title) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }

    // Calculate AI warmth score
    const calculateWarmthScore = (): number => {
      let score = 50; // Base score

      // Urgency boost
      if (urgency === "urgent") score += 30;
      else if (urgency === "high") score += 20;
      else if (urgency === "medium") score += 10;

      // Budget boost
      if (budget) {
        if (budget > 5000000)
          score += 20; // > $50k
        else if (budget > 2500000)
          score += 15; // > $25k
        else if (budget > 1000000) score += 10; // > $10k
      }

      // Work type boost (high-value work)
      if (
        workType &&
        (workType.includes("roof replacement") ||
          workType.includes("solar") ||
          workType.includes("full-remodel"))
      ) {
        score += 10;
      }

      return Math.min(100, score);
    };

    const warmthScore = workType ? calculateWarmthScore() : 50;

    let finalContactId = contactId;

    // Create contact if contactData is provided and no contactId
    if (!contactId && contactData) {
      const { firstName, lastName, email, phone, company, street, city, state, zipCode } =
        contactData;

      if (!firstName || !lastName) {
        return Response.json(
          { error: "Contact firstName and lastName are required" },
          { status: 400 }
        );
      }

      const contact = await prisma.contacts.create({
        data: {
          id: crypto.randomUUID(),
          orgId: effectiveOrgId,
          firstName,
          lastName,
          email,
          phone,
          company,
          street,
          city,
          state,
          zipCode,
          source: source || "lead_form",
          slug: generateContactSlug(firstName, lastName),
          updatedAt: new Date(),
        },
      });

      finalContactId = contact.id;

      // Also create a property profile if address data is provided
      if (street || city || state || zipCode) {
        try {
          const fullAddress = [street, city, state, zipCode].filter(Boolean).join(", ");
          await prisma.properties.create({
            data: {
              id: crypto.randomUUID(),
              orgId: effectiveOrgId,
              name: fullAddress || `${firstName} ${lastName} Property`,
              propertyType: "residential",
              street: street || "",
              city: city || "",
              state: state || "",
              zipCode: zipCode || "",
              contactId: contact.id,
              updatedAt: new Date(),
            },
          });
          logger.info("[POST /api/leads] Created property profile for contact", {
            contactId: contact.id,
            address: fullAddress,
          });
        } catch (propError) {
          logger.warn("[POST /api/leads] Failed to create property profile:", propError);
          // Don't fail the lead creation if property creation fails
        }
      }

      // Save measurements to PropertyProfiles if provided
      if (
        measurements &&
        (measurements.roofSquares || measurements.sidingLinearFeet || measurements.stories)
      ) {
        try {
          // Find or create property profile using the full address as identifier
          const fullAddr = [street, city, state, zipCode].filter(Boolean).join(", ");
          let property = await prisma.property_profiles.findFirst({
            where: { orgId: effectiveOrgId, fullAddress: fullAddr },
          });

          if (property) {
            // Update existing property with measurements
            await prisma.property_profiles.update({
              where: { id: property.id },
              data: {
                roofSquares: measurements.roofSquares ?? property.roofSquares,
                numStories: measurements.stories ?? property.numStories,
                roofPitch: measurements.pitch ?? property.roofPitch,
                updatedAt: new Date(),
              },
            });
          } else {
            // Create new PropertyProfile with measurements
            const propertyId = crypto.randomUUID();
            await prisma.property_profiles.create({
              data: {
                id: crypto.randomUUID(),
                propertyId,
                orgId: effectiveOrgId,
                fullAddress: fullAddr || "Unknown",
                streetAddress: street || "",
                city: city || "",
                state: state || "",
                zipCode: zipCode || "",
                roofSquares: measurements.roofSquares,
                numStories: measurements.stories,
                roofPitch: measurements.pitch,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });
          }
          logger.info("[POST /api/leads] Saved measurements to property profile", {
            contactId: contact.id,
            measurements,
          });
        } catch (measureError) {
          logger.warn("[POST /api/leads] Failed to save measurements:", measureError);
          // Don't fail the lead creation
        }
      }
    }

    if (!finalContactId) {
      return Response.json({ error: "contactId or contactData is required" }, { status: 400 });
    }

    // Find or create user in database to get proper User ID
    let dbUserId: string | null = null;
    if (userId) {
      const dbUser = await prisma.users.findUnique({
        where: { clerkUserId: userId },
        select: { id: true },
      });
      dbUserId = dbUser?.id || null;
    }

    // Create the lead with proper foreign key references
    const createStartTime = Date.now();
    const lead = await createLead({
      orgId: effectiveOrgId,
      title,
      description,
      source: source || "direct",
      value,
      probability,
      stage,
      temperature,
      assignedTo: assignedTo || dbUserId,
      createdBy: dbUserId,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      contactId: finalContactId,
      // NEW: Multi-pipeline fields
      jobType: jobType || "RETAIL",
      workType,
      urgency,
      budget,
      warmthScore,
      // Job category for pipeline routing
      jobCategory: jobCategory || "lead",
    });
    const createMs = Date.now() - createStartTime;
    logInfo("lead.create.completed", { leadId: lead.id, orgId: effectiveOrgId, ms: createMs });

    // Auto-assign if no assignee was specified
    let finalAssignee = lead.assignedTo;
    if (!assignedTo) {
      try {
        // Try geo-routing first if contact has address
        const contactZip = contactData?.zipCode;
        const contactState = contactData?.state;

        if (contactZip || contactState) {
          finalAssignee = await geoAssignLead(lead.id, effectiveOrgId, contactZip, contactState);
        }

        // Fall back to round-robin if geo-routing didn't assign
        if (!finalAssignee) {
          finalAssignee = await autoAssignLead(lead.id, effectiveOrgId);
        }
      } catch (assignError) {
        logger.warn("[POST /api/leads] Auto-assign failed:", assignError);
        // Don't fail the request
      }
    }

    // Create initial activity (optional - don't fail if it errors)
    try {
      await prisma.activities.create({
        data: {
          id: crypto.randomUUID(),
          orgId: effectiveOrgId,
          leadId: lead.id,
          contactId: finalContactId,
          type: "lead_created",
          title: "Lead Created",
          description: `Lead "${title}" was created from ${source || "direct"}`,
          userId: userId || "system",
          userName: "System",
          updatedAt: new Date(),
        },
      });
    } catch (activityError) {
      logger.warn("[POST /api/leads] Failed to create activity:", activityError);
      // Don't fail the request
    }

    return Response.json({ lead, performance: { createMs } }, { status: 201 });
  } catch (error) {
    logger.error("Error creating lead:", error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        return apiError(409, "LEAD_EXISTS", "A lead with this information already exists.");
      }
      if (error.message.includes("Foreign key constraint")) {
        return apiError(
          400,
          "BAD_REFERENCE",
          "Invalid reference data. Please refresh and try again."
        );
      }
      return apiError(500, "LEAD_CREATE_FAILED", "Failed to create lead");
    }
    return apiError(
      500,
      "LEAD_CREATE_FAILED",
      "Failed to create lead. Please try again or contact support."
    );
  }
};

// Convert lead to project
const basePUT = async (request: Request) => {
  try {
    await requirePermission("create_projects");
    const { orgId, userId } = await getCurrentUserPermissions();

    if (!orgId || !userId) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = convertLeadSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { leadId, action } = parsed.data;

    if (action !== "convert_to_project") {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    const lead = await prisma.leads.findFirst({
      where: { id: leadId, orgId },
      include: { contacts: true },
    });

    if (!lead) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }

    // Check if lead already has a project
    const existingProject = await prisma.projects.findFirst({
      where: { leadId: lead.id },
    });

    if (existingProject) {
      return Response.json({ error: "Lead already converted to project" }, { status: 400 });
    }

    // Generate job number
    const jobCount = await prisma.projects.count({ where: { orgId } });
    const jobNumber = `P${String(jobCount + 1).padStart(6, "0")}`;

    // Create project from lead
    const project = await prisma.projects.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        title: lead.title,
        jobNumber,
        leadId: lead.id,
        contactId: lead.contactId,
        status: "QUALIFIED",
        createdBy: userId,
        assignedTo: lead.assignedTo || userId,
        valueEstimate: lead.value || 0,
        notes: lead.description || undefined,
        updatedAt: new Date(),
      },
      include: {
        contacts: true,
        leads: true,
      },
    });

    // Update lead stage
    await prisma.leads.update({
      where: { id: leadId },
      data: {
        stage: "won",
        closedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create activity
    await prisma.activities.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        leadId: lead.id,
        projectId: project.id,
        contactId: lead.contactId,
        type: "lead_converted",
        title: "Lead Converted to Project",
        description: `Lead "${lead.title}" was converted to project ${jobNumber}`,
        userId,
        userName: "System",
        updatedAt: new Date(),
      },
    });

    return Response.json({
      success: true,
      project,
      lead,
    });
  } catch (error) {
    logger.error("Error converting lead:", error);
    return Response.json({ error: "Failed to convert lead" }, { status: 500 });
  }
};

// NOTE: withOrgScope requires x-org-id header which client-side forms don't send.
// All handlers already resolve org via Clerk's getCurrentUserPermissions(), so
// we only need Sentry + rate-limiting here.
const wrap = compose(withSentryApi, withRateLimit);
export const GET = wrap(baseGET);
export const POST = wrap(basePOST);
export const PUT = wrap(basePUT);
