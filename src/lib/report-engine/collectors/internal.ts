// src/lib/report-engine/collectors/internal.ts
import prisma from "@/lib/prisma";

/**
 * INTERNAL CLAIM DATA COLLECTOR
 * Collects all structured claim data from our internal database
 * This is the foundation: insured, property, carrier, financials
 */
export async function collectInternalClaimDataset(claimId: string, orgId?: string | null) {
  const claim = await prisma.claims.findUnique({ where: { id: claimId } });

  if (!claim) {
    throw new Error(`Claim not found: ${claimId}`);
  }

  // Verify org ownership if provided
  if (orgId && claim.orgId !== orgId) {
    throw new Error(`Claim ${claimId} does not belong to org ${orgId}`);
  }

  return {
    // Core claim identifiers
    id: claim.id,
    claimNumber: claim.claimNumber,
    title: claim.title,
    description: claim.description,

    // Loss details
    typeOfLoss: claim.damageType,
    dateOfLoss: claim.dateOfLoss,
    status: claim.status,
    priority: claim.priority,
    lifecycleStage: claim.lifecycle_stage,

    // Financial
    deductible: claim.deductible ?? 0,
    estimatedValue: claim.estimatedValue ?? 0,
    approvedValue: claim.approvedValue ?? 0,
    exposureCents: claim.exposure_cents ?? 0,

    // Policy & carrier
    policyNumber: claim.policy_number,
    carrier: {
      name: claim.carrier,
      adjusterName: claim.adjusterName,
      adjusterPhone: claim.adjusterPhone,
      adjusterEmail: claim.adjusterEmail,
    },

    // Insured
    insured: {
      name: claim.insured_name,
      email: claim.homeowner_email,
    },

    // Property
    property: null,

    // Related data counts (for AI context)
    relatedData: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inspectionsCount: (claim as any).inspections?.length ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      estimatesCount: (claim as any).estimates?.length ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supplementsCount: (claim as any).supplements?.length ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      weatherReportsCount: (claim as any).weatherReports?.length ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      damageAssessmentsCount: (claim as any).damageAssessments?.length ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scopesCount: (claim as any).scopes?.length ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reportsCount: (claim as any).reports?.length ?? 0,
    },

    // Timestamps
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
  };
}
