/**
 * Claims Lifecycle Utilities
 * State validation, exposure calculations, depreciation drafts
 */

import { ClaimLifecycleStage } from "@prisma/client";

import { AZ_DEFAULT_TAX_RATE } from "@/lib/constants/taxRates";
import prisma from "@/lib/prisma";

// Valid state transitions map
const VALID_TRANSITIONS: Record<ClaimLifecycleStage, ClaimLifecycleStage[]> = {
  FILED: ["ADJUSTER_REVIEW"],
  ADJUSTER_REVIEW: ["APPROVED", "DENIED"],
  APPROVED: ["BUILD"],
  DENIED: ["APPEAL"],
  APPEAL: ["APPROVED", "DENIED"],
  BUILD: ["COMPLETED"],
  COMPLETED: ["DEPRECIATION"],
  DEPRECIATION: [],
};

/**
 * Validate if a state transition is allowed
 */
export function validateStateTransition(
  from: ClaimLifecycleStage | null,
  to: ClaimLifecycleStage
): boolean {
  if (!from) {
    // New claim can only start at FILED
    return to === "FILED";
  }

  const allowedNext = VALID_TRANSITIONS[from] || [];
  return allowedNext.includes(to);
}

/**
 * Get next allowed stages from current stage
 */
export function getNextStages(current: ClaimLifecycleStage | null): ClaimLifecycleStage[] {
  if (!current) return ["FILED"];
  return VALID_TRANSITIONS[current] || [];
}

/**
 * Compute financial exposure for a claim
 */
export async function computeExposure(claim_id: string) {
  const payments = await prisma.claim_payments.findMany({
    where: { claim_id },
  });

  const supplements = await prisma.claim_supplements.findMany({
    where: {
      claim_id,
      status: { in: ["APPROVED", "REQUESTED"] },
    },
  });

  const paidCents = payments.reduce((sum, p) => sum + p.amount_cents, 0);
  const supplementCents = supplements
    .filter((s) => s.status === "APPROVED")
    .reduce((sum, s) => sum + s.total_cents, 0);
  const pendingCents = supplements
    .filter((s) => s.status === "REQUESTED")
    .reduce((sum, s) => sum + s.total_cents, 0);

  const exposureCents = paidCents + supplementCents + pendingCents;

  return {
    exposureCents,
    paidCents,
    approvedSupplementCents: supplementCents,
    pendingSupplementCents: pendingCents,
  };
}

/**
 * Build depreciation invoice draft
 */
export async function buildDepreciationDraft(claim_id: string) {
  const claim = await prisma.claims.findUnique({
    where: { id: claim_id },
    include: {
      claim_payments: true,
      claim_supplements: {
        where: { status: "APPROVED" },
      },
    },
  });

  if (!claim) {
    throw new Error("Claim not found");
  }

  // Example depreciation calculation (25% for roofing, 15% for other)
  const lineItems: Array<{
    description: string;
    cost: number;
    depreciationRate: number;
    depreciation: number;
    recoverable: number;
  }> = [];
  let subtotalCents = 0;
  let depreciationCents = 0;

  // Add payments as line items
  for (const payment of claim.claim_payments) {
    const itemCost = payment.amount_cents;
    const depRate = payment.type === "ACV" ? 0.25 : 0.15; // Example rates
    const depAmount = Math.round(itemCost * depRate);

    lineItems.push({
      description: `Payment ${payment.type} - ${payment.check_number || "N/A"}`,
      cost: itemCost,
      depreciationRate: depRate,
      depreciation: depAmount,
      recoverable: itemCost - depAmount,
    });

    subtotalCents += itemCost;
    depreciationCents += depAmount;
  }

  // Add supplements as line items
  for (const supp of claim.claim_supplements) {
    const itemCost = supp.total_cents;
    const depRate = 0.2; // Example rate for supplements
    const depAmount = Math.round(itemCost * depRate);

    lineItems.push({
      description: `Supplement ${supp.id.slice(0, 8)}`,
      cost: itemCost,
      depreciationRate: depRate,
      depreciation: depAmount,
      recoverable: itemCost - depAmount,
    });

    subtotalCents += itemCost;
    depreciationCents += depAmount;
  }

  // TODO: resolve city-level rate from claim address when available
  const taxRate = AZ_DEFAULT_TAX_RATE;
  const taxCents = Math.round((subtotalCents - depreciationCents) * taxRate);
  const totalDueCents = subtotalCents - depreciationCents + taxCents;

  return {
    subtotalCents,
    depreciationCents,
    taxCents,
    totalDueCents,
    lineItems,
  };
}

/**
 * Get claim stage display info
 */
export function getStageInfo(stage: ClaimLifecycleStage) {
  const info = {
    FILED: { label: "Filed", color: "blue", icon: "FileText" },
    ADJUSTER_REVIEW: { label: "Adjuster Review", color: "yellow", icon: "Eye" },
    APPROVED: { label: "Approved", color: "green", icon: "CheckCircle" },
    DENIED: { label: "Denied", color: "red", icon: "XCircle" },
    APPEAL: { label: "Appeal", color: "orange", icon: "RefreshCw" },
    BUILD: { label: "Build Phase", color: "purple", icon: "Hammer" },
    COMPLETED: { label: "Completed", color: "green", icon: "Check" },
    DEPRECIATION: { label: "Depreciation", color: "gray", icon: "Calculator" },
  };

  return info[stage] || { label: stage, color: "gray", icon: "Circle" };
}
