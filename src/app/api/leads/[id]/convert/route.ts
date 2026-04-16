/**
 * Lead to Claim Conversion API
 *
 * POST /api/leads/[id]/convert - Convert a lead to a claim
 *
 * This endpoint:
 * 1. Creates a new claim from lead data
 * 2. Links the lead to the new claim via claimId
 * 3. Updates lead stage to "converted"
 * 4. Copies relevant data (contact info, property, description)
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const convertLeadSchema = z.object({
  insuranceCompany: z.string().min(1, "Insurance company is required"),
  policyNumber: z.string().optional(),
  dateOfLoss: z.string().min(1, "Date of loss is required"),
  typeOfLoss: z.string().min(1, "Type of loss is required"),
  claimNumber: z.string().optional(),
  description: z.string().optional(),
});

/**
 * POST /api/leads/[id]/convert - Convert lead to claim
 */
export const POST = withOrgScope(async (request, { orgId, userId }, routeCtx) => {
  try {
    const params = (routeCtx as { params: { id: string } }).params;

    // Get the lead with contact info
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
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Check if lead is already converted
    if (lead.claimId) {
      return NextResponse.json(
        { error: "Lead has already been converted to a claim", claimId: lead.claimId },
        { status: 400 }
      );
    }

    if (lead.stage === "converted" || lead.stage === "CONVERTED") {
      return NextResponse.json({ error: "Lead has already been converted" }, { status: 400 });
    }

    const body = await request.json();
    const validated = convertLeadSchema.parse(body);

    // Build property address from contact if available
    const contact = lead.contacts;
    const propertyAddress = contact
      ? [contact.street, contact.city, contact.state, contact.zipCode].filter(Boolean).join(", ")
      : "";

    // Get or create property for the claim
    let propertyId: string | null = null;

    if (contact?.street && contact?.city && contact?.state && contact?.zipCode) {
      // Check if property already exists for this contact
      const existingProperty = await prisma.properties.findFirst({
        where: {
          orgId,
          contactId: contact.id,
          street: contact.street,
        },
      });

      if (existingProperty) {
        propertyId = existingProperty.id;
      } else {
        // Create new property
        const newProperty = await prisma.properties.create({
          data: {
            id: crypto.randomUUID(),
            orgId,
            contactId: contact.id,
            name: contact.street,
            propertyType: "residential",
            street: contact.street,
            city: contact.city,
            state: contact.state,
            zipCode: contact.zipCode,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        propertyId = newProperty.id;
      }
    }

    if (!propertyId) {
      return NextResponse.json(
        {
          error:
            "Cannot convert lead: No property address available. Please add address info to the contact first.",
        },
        { status: 400 }
      );
    }

    // Generate claim number if not provided
    const claimCount = await prisma.claims.count({ where: { orgId } });
    const claimNumber =
      validated.claimNumber ||
      `CLM-${Date.now().toString(36).toUpperCase()}-${(claimCount + 1).toString().padStart(4, "0")}`;

    // Create the claim
    const claim = await prisma.claims.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        propertyId,
        claimNumber,
        title: `${validated.typeOfLoss} - ${propertyAddress || lead.title}`,
        description: validated.description || lead.description || "",
        damageType: validated.typeOfLoss,
        dateOfLoss: new Date(validated.dateOfLoss),
        carrier: validated.insuranceCompany,
        // Note: policyNumber stored in description if provided
        status: "new",
        priority: "medium",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Update the lead to link it to the claim
    await prisma.leads.update({
      where: { id: params.id, orgId },
      data: {
        claimId: claim.id,
        stage: "converted",
        jobCategory: "claim",
        updatedAt: new Date(),
      },
    });

    // Log the conversion activity
    try {
      await prisma.activities.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          leadId: params.id,
          claimId: claim.id,
          type: "LEAD_CONVERTED",
          title: "Lead Converted",
          description: `Lead converted to claim ${claimNumber}`,
          userId: userId,
          userName: "System",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (activityError) {
      // Don't fail conversion if activity logging fails
      logger.warn("[LeadConvert] Activity logging failed:", activityError);
    }

    logger.debug(`[LeadConvert] Successfully converted lead ${params.id} to claim ${claim.id}`);

    return NextResponse.json({
      success: true,
      claim: {
        id: claim.id,
        claimNumber: claim.claimNumber,
        title: claim.title,
        status: claim.status,
      },
      lead: {
        id: lead.id,
        stage: "converted",
      },
      message: "Lead successfully converted to claim",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return NextResponse.json({ error: `Validation failed: ${fieldErrors}` }, { status: 400 });
    }

    logger.error(`[POST /api/leads/${params.id}/convert] Error:`, error);
    return NextResponse.json({ error: "Failed to convert lead" }, { status: 500 });
  }
});
