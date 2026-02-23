/**
 * POST /api/jobs/move
 * Move a job between workflow categories (claim, repair, out_of_pocket, financed)
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { generateContactSlug } from "@/lib/generateContactSlug";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (req: NextRequest, { userId, orgId: userOrgId }) => {
  try {
    const body = await req.json();
    const { itemId, itemType, fromCategory, toCategory } = body;

    if (!itemId || !toCategory) {
      return NextResponse.json({ error: "itemId and toCategory are required" }, { status: 400 });
    }

    logger.debug(`[Move Job] Moving ${itemType} ${itemId} from ${fromCategory} to ${toCategory}`);

    if (itemType === "lead") {
      // Moving a lead to a different category
      // SECURITY: Scope lead lookup to user's org (withAuth provides DB orgId)
      const lead = await prisma.leads.findFirst({
        where: { id: itemId, orgId: userOrgId },
      });
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }

      // If moving TO claim, we need to create a claim and link it
      if (toCategory === "claim" && !lead.claimId) {
        // Resolve a property for the claim (FK required)
        let resolvedPropertyId: string;
        const existingProperty = await prisma.properties.findFirst({
          where: { contactId: lead.contactId, orgId: lead.orgId },
          select: { id: true },
        });
        if (existingProperty) {
          resolvedPropertyId = existingProperty.id;
        } else {
          // Create a placeholder property from contact data
          const contact = await prisma.contacts.findUnique({
            where: { id: lead.contactId },
          });
          const newProperty = await prisma.properties.create({
            data: {
              id: `prop-from-lead-${itemId}`,
              orgId: lead.orgId,
              contactId: lead.contactId,
              name: "Primary Property",
              propertyType: "residential",
              street: contact?.street || "TBD",
              city: contact?.city || "TBD",
              state: contact?.state || "AZ",
              zipCode: contact?.zipCode || "00000",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          resolvedPropertyId = newProperty.id;
        }

        // Create a new claim from this lead
        const claim = await prisma.claims.create({
          data: {
            id: `claim-from-lead-${itemId}`,
            orgId: lead.orgId,
            propertyId: resolvedPropertyId,
            claimNumber: `CLM-${Date.now()}`,
            title: lead.title || "Converted from Lead",
            damageType: "UNKNOWN",
            dateOfLoss: new Date(),
            status: "new",
            estimatedValue: lead.value,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Link the lead to the claim
        await prisma.leads.update({
          where: { id: itemId },
          data: {
            claimId: claim.id,
            jobCategory: toCategory,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: `Lead converted to claim`,
          claimId: claim.id,
        });
      }

      // If moving FROM claim to something else, unlink the claim
      if (fromCategory === "claim" && toCategory !== "claim" && lead.claimId) {
        await prisma.leads.update({
          where: { id: itemId },
          data: {
            claimId: null,
            jobCategory: toCategory,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: `Job moved from claim to ${toCategory}`,
        });
      }

      // Simple category change
      await prisma.leads.update({
        where: { id: itemId },
        data: {
          jobCategory: toCategory,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Job moved to ${toCategory}`,
      });
    }

    if (itemType === "claim") {
      // Moving a claim - this is more complex
      // Claims stay in claims table but we can create a linked lead for OOP work
      // SECURITY: Scope claim lookup to user's org (prevents cross-tenant IDOR)
      const claim = await prisma.claims.findFirst({ where: { id: itemId, orgId: userOrgId } });
      if (!claim) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }

      if (toCategory === "claim") {
        // Already a claim, nothing to do
        return NextResponse.json({ success: true, message: "Already a claim" });
      }

      // Create a lead linked to this claim but with different category
      const existingLead = await prisma.leads.findUnique({
        where: { claimId: itemId },
      });

      if (existingLead) {
        // Update existing linked lead
        await prisma.leads.update({
          where: { id: existingLead.id },
          data: {
            jobCategory: toCategory,
            updatedAt: new Date(),
          },
        });
      } else {
        // Need a contact first - try to find or create one
        let contactId: string | null = null;

        if (claim.clientId) {
          // Use client's email to find a matching contact
          const client = await prisma.clients.findUnique({
            where: { id: claim.clientId },
          });
          if (client?.email) {
            const existingContact = await prisma.contacts.findFirst({
              where: { orgId: claim.orgId, email: client.email },
              select: { id: true },
            });
            contactId = existingContact?.id || null;
          }
        }

        if (!contactId) {
          // Create a placeholder contact
          const contact = await prisma.contacts.create({
            data: {
              id: `contact-from-claim-${itemId}`,
              orgId: claim.orgId,
              firstName: claim.insured_name?.split(" ")[0] || "Unknown",
              lastName: claim.insured_name?.split(" ").slice(1).join(" ") || "Contact",
              slug: generateContactSlug(
                claim.insured_name?.split(" ")[0] || "Unknown",
                claim.insured_name?.split(" ").slice(1).join(" ") || "Contact"
              ),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          contactId = contact.id;
        }

        // Create linked lead
        await prisma.leads.create({
          data: {
            id: `lead-from-claim-${itemId}`,
            orgId: claim.orgId,
            contactId,
            claimId: itemId,
            title: claim.title || "Converted from Claim",
            description: claim.description,
            source: "claim_conversion",
            value: claim.estimatedValue,
            stage: "new",
            jobCategory: toCategory,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Claim work moved to ${toCategory} workflow`,
      });
    }

    return NextResponse.json({ error: "Invalid itemType" }, { status: 400 });
  } catch (error) {
    logger.error("[Move Job] Error:", error);
    return NextResponse.json(
      { error: "Failed to move job", details: "Internal server error" },
      { status: 500 }
    );
  }
});
