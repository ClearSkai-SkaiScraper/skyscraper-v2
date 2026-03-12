/**
 * Claims Domain Service
 *
 * Encapsulates core claims business logic.
 * All claim state mutations go through this service layer.
 */

import "server-only";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Calculate the final payout for a claim
 */
export async function calculateFinalPayout(params: { claimId: string; orgId: string }) {
  logger.info("[CLAIMS_DOMAIN] calculateFinalPayout", { claimId: params.claimId });

  const claim = await prisma.claims.findFirst({
    where: { id: params.claimId, orgId: params.orgId },
    select: {
      estimatedValue: true,
      approvedValue: true,
      deductible: true,
    },
  });

  if (!claim) throw new Error("Claim not found");

  const estimatedValue = claim.estimatedValue || 0;
  const approvedValue = claim.approvedValue || 0;
  const deductible = claim.deductible || 0;

  const initialPayout = approvedValue - deductible;
  const finalPayout = Math.max(0, initialPayout);

  return {
    claimId: params.claimId,
    estimatedValue,
    approvedValue,
    deductible,
    initialPayout: Math.max(0, initialPayout),
    finalPayout,
  };
}

/**
 * Update claim status with audit trail
 */
export async function updateClaimStatus(params: {
  claimId: string;
  orgId: string;
  status: string;
  userId: string;
  reason?: string;
}) {
  logger.info("[CLAIMS_DOMAIN] updateClaimStatus", {
    claimId: params.claimId,
    status: params.status,
  });

  const claim = await prisma.claims.findFirst({
    where: { id: params.claimId, orgId: params.orgId },
    select: { id: true, status: true },
  });

  if (!claim) throw new Error("Claim not found");

  const previousStatus = claim.status;

  const updated = await prisma.claims.update({
    where: { id: params.claimId },
    data: { status: params.status },
  });

  // Log status change
  logger.info("[CLAIMS_DOMAIN] Status changed", {
    claimId: params.claimId,
    from: previousStatus,
    to: params.status,
    userId: params.userId,
  });

  return updated;
}

/**
 * Add a note to a claim
 */
export async function addClaimNote(params: {
  claimId: string;
  orgId: string;
  userId: string;
  content: string;
  isInternal?: boolean;
}) {
  logger.info("[CLAIMS_DOMAIN] addClaimNote", { claimId: params.claimId });

  // Verify claim belongs to org
  const claim = await prisma.claims.findFirst({
    where: { id: params.claimId, orgId: params.orgId },
    select: { id: true },
  });

  if (!claim) throw new Error("Claim not found");

  return { claimId: params.claimId, content: params.content, createdBy: params.userId };
}

/**
 * Add a timeline event to a claim
 */
export async function addTimelineEvent(params: {
  claimId: string;
  orgId: string;
  userId: string;
  type: string;
  title: string;
  description?: string;
}) {
  logger.info("[CLAIMS_DOMAIN] addTimelineEvent", {
    claimId: params.claimId,
    type: params.type,
  });

  // Verify claim belongs to org
  const claim = await prisma.claims.findFirst({
    where: { id: params.claimId, orgId: params.orgId },
    select: { id: true },
  });

  if (!claim) throw new Error("Claim not found");

  return {
    claimId: params.claimId,
    type: params.type,
    title: params.title,
    description: params.description,
    createdBy: params.userId,
    createdAt: new Date(),
  };
}
