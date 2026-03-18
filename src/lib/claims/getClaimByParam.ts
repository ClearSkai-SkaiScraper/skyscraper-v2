// src/lib/claims/getClaimByParam.ts
// CRITICAL: Resolve claims by id OR claimNumber to fix "claim not found" cascading errors

import { prismaModel } from "@/lib/db/prismaModel";
import { logger } from "@/lib/logger";

/**
 * Resolve a claim by either database id or claimNumber
 * Handles both orgId and organizationId field names for resilience
 *
 * @param orgId - Organization ID to scope the query
 * @param claimParam - Either a database UUID or a claimNumber like "CL-1765828836605-A1s9Ar"
 * @returns The claim or null if not found
 */
export async function getClaimByParam(orgId: string, claimParam: string) {
  try {
    const claim = await prismaModel("claims")
      .findFirst({
        where: {
          orgId,
          OR: [{ id: claimParam }, { claimNumber: claimParam }],
        },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          propertyId: true,
        },
      })
      .catch(() => null);

    if (!claim) return null;

    const property = claim.propertyId
      ? await prismaModel("properties")
          .findUnique({
            where: { id: claim.propertyId },
            select: {
              id: true,
              street: true,
              city: true,
              state: true,
              zipCode: true,
              contactId: true,
            },
          })
          .catch(() => null)
      : null;

    const contact = property?.contactId
      ? await prismaModel("contacts")
          .findUnique({
            where: { id: property.contactId },
            select: { id: true, firstName: true, lastName: true, email: true },
          })
          .catch(() => null)
      : null;

    return {
      id: claim.id,
      title: claim.title || null,
      status: claim.status || null,
      property: property
        ? { address: `${property.street}, ${property.city}, ${property.state} ${property.zipCode}` }
        : null,
      contact,
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt,
    };
  } catch (error) {
    logger.error("[getClaimByParam] Error:", error);
    return null;
  }
}

/**
 * Get full claim details with all fields for workspace
 */
export async function getClaimDetailsByParam(orgId: string, claimParam: string) {
  try {
    const claim = await prismaModel("claims")
      .findFirst({
        where: {
          orgId,
          OR: [{ id: claimParam }, { claimNumber: claimParam }],
        },
        select: {
          id: true,
          orgId: true,
          claimNumber: true,
          title: true,
          status: true,
          description: true,
          damageType: true,
          dateOfLoss: true,
          carrier: true,
          adjusterName: true,
          adjusterPhone: true,
          adjusterEmail: true,
          priority: true,
          estimatedValue: true,
          approvedValue: true,
          deductible: true,
          assignedTo: true,
          createdAt: true,
          updatedAt: true,
          propertyId: true,
          estimatedJobValue: true,
          jobValueStatus: true,
        },
      })
      .catch(() => null);

    if (!claim) return null;

    const property = claim.propertyId
      ? await prismaModel("properties")
          .findUnique({
            where: { id: claim.propertyId },
            select: {
              id: true,
              street: true,
              city: true,
              state: true,
              zipCode: true,
              contactId: true,
            },
          })
          .catch(() => null)
      : null;

    const contact = property?.contactId
      ? await prismaModel("contacts")
          .findUnique({
            where: { id: property.contactId },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          })
          .catch(() => null)
      : null;

    // Derive insured_name and homeownerEmail from contact
    const insured_name = contact ? `${contact.firstName} ${contact.lastName}`.trim() : null;
    const homeownerEmail = contact?.email ?? null;

    return {
      id: claim.id,
      orgId: claim.orgId,
      claimNumber: claim.claimNumber,
      title: claim.title || null,
      status: claim.status || null,
      description: claim.description || null,
      damageType: claim.damageType || null,
      dateOfLoss: claim.dateOfLoss,
      carrier: claim.carrier || null,
      adjusterName: claim.adjusterName || null,
      adjusterPhone: claim.adjusterPhone || null,
      adjusterEmail: claim.adjusterEmail || null,
      priority: claim.priority || null,
      estimatedValue: claim.estimatedValue || 0,
      approvedValue: claim.approvedValue || 0,
      deductible: claim.deductible || 0,
      estimatedJobValue: claim.estimatedJobValue ?? null,
      jobValueStatus: (claim.jobValueStatus as string) || "draft",
      assignedTo: claim.assignedTo || null,
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt,
      propertyId: claim.propertyId,
      // Derived fields for compatibility
      insured_name,
      homeownerEmail,
      policyNumber: null, // Not in schema - add if needed
      coverPhotoUrl: null, // Not in schema - add if needed
      coverPhotoId: null, // Not in schema - add if needed
      lifecycle_stage: "FILED", // Default
      property: property
        ? { address: `${property.street}, ${property.city}, ${property.state} ${property.zipCode}` }
        : null,
      contact,
    };
  } catch (error) {
    logger.error("[getClaimDetailsByParam] Error:", error);
    return null;
  }
}
