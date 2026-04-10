/**
 * Claim State Machine
 *
 * Manages workflow states for claims and defines valid transitions.
 * Ensures claims follow a logical progression through the pipeline.
 */

import prisma from "@/lib/prisma";

import { ClaimStateEnum } from "../types";

/**
 * Define allowed state transitions
 * Each state can only transition to specific next states
 */
const allowedTransitions: Record<ClaimStateEnum, ClaimStateEnum[]> = {
  INTAKE: ["INSPECTED"],
  INSPECTED: ["ESTIMATE_DRAFTED"],
  ESTIMATE_DRAFTED: ["SUBMITTED"],
  SUBMITTED: ["NEGOTIATING", "APPROVED"],
  NEGOTIATING: ["APPROVED", "SUBMITTED"], // Can go back to submitted if revised
  APPROVED: ["IN_PRODUCTION"],
  IN_PRODUCTION: ["COMPLETE"],
  COMPLETE: ["PAID"],
  PAID: [], // Terminal state
};

/**
 * Get current state of a claim
 */
export async function getCurrentClaimState(claimId: string): Promise<ClaimStateEnum | null> {
  const last = await prisma.claimBrainState.findFirst({
    where: { claimId },
    orderBy: { createdAt: "desc" },
  });

  return (last?.currentState as ClaimStateEnum) ?? null;
}

/**
 * Get all allowed next states for current state
 */
export function getAllowedNextStates(current: ClaimStateEnum | null): ClaimStateEnum[] {
  if (!current) return ["INTAKE"];
  return allowedTransitions[current] ?? [];
}

/**
 * Check if a transition is valid
 */
export function isValidTransition(from: ClaimStateEnum | null, to: ClaimStateEnum): boolean {
  const allowed = getAllowedNextStates(from);
  return allowed.includes(to);
}

/**
 * Transition claim to new state
 */
export async function transitionClaimState(
  claimId: string,
  newState: ClaimStateEnum,
  notes?: string
): Promise<void> {
  const current = await getCurrentClaimState(claimId);

  if (!isValidTransition(current, newState)) {
    throw new Error(
      `Invalid state transition: ${current || "null"} -> ${newState}. ` +
        `Allowed transitions: ${getAllowedNextStates(current).join(", ")}`
    );
  }

  await prisma.claimBrainState.create({
    data: {
      id: crypto.randomUUID(),
      claimId,
      orgId: "", // Will need to be passed in or derived
      currentState: newState,
      previousState: current,
      brainLogs: notes ? { notes } : undefined,
      updatedAt: new Date(),
    },
  });
}

/**
 * Get state history for a claim
 */
export async function getClaimStateHistory(
  claimId: string
): Promise<Array<{ state: ClaimStateEnum; notes?: string; createdAt: Date }>> {
  const history = await prisma.claimBrainState.findMany({
    where: { claimId },
    orderBy: { createdAt: "asc" },
  });

  return history.map((h) => ({
    state: h.currentState as ClaimStateEnum,
    notes: (h.brainLogs as { notes?: string } | null)?.notes || undefined,
    createdAt: h.createdAt,
  }));
}

/**
 * Get average time spent in each state (for analytics)
 */
export async function getStateTimingAnalytics(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  orgId: string
): Promise<Record<ClaimStateEnum, number>> {
  // This would aggregate timing data across all claims
  // Placeholder for now - would need complex SQL query
  return {
    INTAKE: 0,
    INSPECTED: 0,
    ESTIMATE_DRAFTED: 0,
    SUBMITTED: 0,
    NEGOTIATING: 0,
    APPROVED: 0,
    IN_PRODUCTION: 0,
    COMPLETE: 0,
    PAID: 0,
  };
}
