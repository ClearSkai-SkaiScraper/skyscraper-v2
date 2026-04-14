export const dynamic = "force-dynamic";

/**
 * PHASE C: Elite Claim Intake API
 * POST /api/claims/intake
 *
 * Professional 3-step claim creation with auto-healing org validation
 */

import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/requireAuth";
import { getNextActionFromStatus } from "@/lib/claims/status";
import { generateContactSlug } from "@/lib/generateContactSlug";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { claimIntakeSchema } from "@/lib/validation/claim-schemas";
import { isValidationError, validateBody } from "@/lib/validation/middleware";

export async function POST(req: Request) {
  try {
    // 1. AUTH & ORG VALIDATION with requireAuth
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { orgId, userId } = auth;

    // 2. PARSE & VALIDATE REQUEST BODY (Zod)
    const body = await validateBody(req, claimIntakeSchema);
    if (isValidationError(body)) return body;
    const {
      dateOfLoss,
      lossType,
      tradeType,
      status,
      propertyAddress,
      structureType,
      stories,
      roofType,
      slope,
      squareFootage,
      contactId,
      contactName,
      contactPhone,
      contactEmail,
      policyNumber,
      carrier,
      deductible,
      agentName,
    } = body;

    // 4. AUTO-CREATE CONTACT if needed (contactId is required FK on properties)
    let finalContactId = contactId;
    // Guard against orphaned contactId — verify it exists AND belongs to this org
    if (finalContactId) {
      const existingContact = await prisma.contacts.findFirst({
        where: { id: finalContactId, orgId },
        select: { id: true },
      });
      if (!existingContact) {
        logger.warn(
          `[Intake] Provided contactId ${finalContactId} not found in org ${orgId}, will auto-create`
        );
        finalContactId = null;
      }
    }
    if (!finalContactId) {
      const firstName = contactName?.split(" ")[0] || "Unknown";
      const lastName = contactName?.split(" ").slice(1).join(" ") || "Homeowner";

      const contact = await prisma.contacts.create({
        data: {
          id: nanoid(),
          orgId,
          firstName,
          lastName,
          phone: contactPhone || null,
          email: contactEmail || null,
          slug: generateContactSlug(firstName, lastName),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      finalContactId = contact.id;
    }

    // 5. GENERATE CLAIM NUMBER
    const claimNumber = `CL-${Date.now()}-${nanoid(6)}`;

    // 6. DETERMINE NEXT ACTION
    const finalStatus = status || "new";
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const nextAction = getNextActionFromStatus(finalStatus);

    // 7. CREATE PROPERTY RECORD — persist structure/roof data from wizard
    const sqft = squareFootage ? Number(String(squareFootage)) || null : null;
    const propertyRecord = await prisma.properties.create({
      data: {
        id: nanoid(),
        orgId,
        contactId: finalContactId, // Always valid — contact created above if needed
        name: `Property at ${propertyAddress}`,
        propertyType: structureType || "residential",
        street: propertyAddress || "Unknown",
        city: "",
        state: "",
        zipCode: "",
        squareFootage: sqft,
        roofType: roofType || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 8. CREATE CLAIM
    const claim = await prisma.claims.create({
      data: {
        id: nanoid(),
        orgId,
        claimNumber,

        // Required fields
        title: `${lossType || "Unknown"} Loss${tradeType ? ` (${tradeType})` : ""} - ${propertyAddress}`,
        description: `Claim created via intake wizard on ${new Date().toLocaleDateString()}`,
        damageType: lossType || "UNKNOWN",
        dateOfLoss: new Date(dateOfLoss),
        status: finalStatus,

        // Contact
        insured_name: contactName || null,
        homeowner_email: contactEmail || null,

        // Property - Link to created property record
        propertyId: propertyRecord.id,

        // Policy fields (already exist in schema)
        policy_number: policyNumber || null,
        carrier: carrier || null,
        deductible: deductible ? Number(String(deductible).replace(/[^0-9.]/g, "")) || null : null,

        // Metadata
        priority: "medium",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 9. LOG ACTIVITY (optional - non-blocking)
    prisma.activities
      .create({
        data: {
          id: nanoid(),
          orgId,
          type: "CLAIM_CREATED",
          title: `Claim ${claimNumber} created`,
          userId: userId || "system",
          userName: "Intake Wizard",
          claimId: claim.id,
          metadata: {
            method: "intake_wizard",
            lossType,
            tradeType,
            structureType,
            roofType,
            slope,
            stories,
            squareFootage: sqft,
            agentName,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .catch((err) => {
        logger.error("[Intake] Failed to log activity:", err);
        // Non-critical, continue
      });

    return NextResponse.json({ claimId: claim.id }, { status: 201 });
  } catch (error) {
    logger.error("[Intake API] Error:", error);
    return NextResponse.json({ error: "Failed to create claim" }, { status: 500 });
  }
}
