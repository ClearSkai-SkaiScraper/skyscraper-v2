/**
 * AI ORCHESTRATOR - THE BRAIN
 *
 * This is the main coordination layer that brings together all AI systems:
 * - Agent Registry: Which agents to use
 * - Rules Engine: What rules apply
 * - State Machine: What state are we in, what's next
 * - Claim Planner: What actions should we take
 * - Similarity Engine: What worked before
 * - Explanation Layer: Why this recommendation
 * - Feedback Loop: Log actions and outcomes
 * - Negotiation Engine: Carrier-specific tactics
 *
 * Returns comprehensive intelligence for a claim.
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

import { buildExplanation } from "../explanations/generateExplanation";
import { logAIAction } from "../feedback/logAction";
import { getNegotiationSuggestions } from "../negotiation/strategyEngine";
import { getNextActionsForClaim } from "../planner/claimPlanner";
import { getAllowedNextStates, getCurrentClaimState } from "../planner/stateMachine";
import { evaluateClaimRules } from "../rules/evaluateRules";
import { findSimilarClaims } from "../similarity/querySimilarClaims";
import {
  ClaimIntelligence,
  ExplanationPayload,
  NegotiationSuggestion,
  NextActionSuggestion,
} from "../types";

export interface OrchestratorInput {
  claimId: string;
  orgId: string;
  requestType?: "next_actions" | "full_intelligence" | "negotiate";
}

export interface OrchestratorOutput {
  claimId: string;
  intelligence: ClaimIntelligence;
  nextActions: NextActionSuggestion[];
  explanation: ExplanationPayload;
  negotiationSuggestions?: NegotiationSuggestion[];
  similarClaims: {
    claimId: string;
    score: number;
    outcome?: string;
  }[];
  allowedNextStates: string[];
  timestamp: Date;
}

/**
 * MAIN ORCHESTRATOR
 *
 * Call this to get AI intelligence for any claim.
 */
export async function orchestrateClaim(input: OrchestratorInput): Promise<OrchestratorOutput> {
  logger.debug(`🧠 Orchestrating claim ${input.claimId}...`);

  // 1. Get claim data
  const claim = await prisma.claims.findUnique({
    where: { id: input.claimId },
  });

  if (!claim) {
    throw new Error(`Claim ${input.claimId} not found`);
  }

  // 2. Get current state
  const currentState = await getCurrentClaimState(input.claimId);
  const allowedNextStates = getAllowedNextStates(currentState);

  logger.debug(`📊 Current state: ${currentState || "INTAKE"}`);

  // 3. Evaluate rules
  const ruleEvaluation = await evaluateClaimRules(input.claimId);
  const triggeredRules = ruleEvaluation.triggered;
  logger.debug(`📋 Triggered ${triggeredRules.length} rules`);

  // 4. Get next actions from planner
  const nextActions = getNextActionsForClaim({
    claimId: input.claimId,
    state: currentState as any,
    rules: triggeredRules,
  });
  logger.debug(`🎯 Generated ${nextActions.length} action suggestions`);

  // 5. Find similar claims
  const similarClaims = await findSimilarClaims(input.claimId, 5);
  logger.debug(`🔍 Found ${similarClaims.length} similar claims`);

  // 6. Calculate intelligence metrics
  const intelligence = await calculateClaimIntelligence({
    claimId: input.claimId,
    triggeredRules,
    similarClaims,
    currentState: currentState || "INTAKE",
  });

  console.log(
    `🤖 Intelligence: ${Math.round((intelligence.approvalLikelihood || 0) * 100)}% approval likelihood`
  );

  // 7. Generate explanation for top action
  const topAction = nextActions[0];
  let explanation: ExplanationPayload = {
    reasoning: "No specific recommendations at this time.",
    rulesUsed: [],
    similarCases: [],
  };

  if (topAction) {
    explanation = buildExplanation({
      claimId: input.claimId,
      rules: triggeredRules,
      similarCases: similarClaims,
      actionType: topAction.actionType,
      confidence: undefined, // Can add to NextActionSuggestion later
    });
  }

  // 8. Get negotiation suggestions if carrier is set
  let negotiationSuggestions: NegotiationSuggestion[] | undefined;

  if (
    claim.carrier &&
    (input.requestType === "negotiate" || input.requestType === "full_intelligence")
  ) {
    negotiationSuggestions = await getNegotiationSuggestions({
      carrier: claim.carrier,
      claimId: input.claimId,
      estimateValue: claim.estimatedValue ?? undefined,
    });

    logger.debug(`💼 Generated ${negotiationSuggestions.length} negotiation suggestions`);
  }

  // 9. Log orchestration action
  await logAIAction({
    claimId: input.claimId,
    agentId: "orchestrator", // Static agent identifier
    actionType: "orchestrate",
    inputData: { requestType: input.requestType },
    outputData: {
      actionsCount: nextActions.length,
      rulesCount: triggeredRules.length,
      similarClaimsCount: similarClaims.length,
      approvalLikelihood: intelligence.approvalLikelihood,
    },
  });

  logger.debug(`✅ Orchestration complete`);

  return {
    claimId: input.claimId,
    intelligence,
    nextActions,
    explanation,
    negotiationSuggestions,
    similarClaims: similarClaims.map((sc) => ({
      claimId: sc.claimId,
      score: sc.score,
    })),
    allowedNextStates,
    timestamp: new Date(),
  };
}

/**
 * Calculate intelligence metrics for a claim
 */
async function calculateClaimIntelligence(params: {
  claimId: string;
  triggeredRules: any[];
  similarClaims: any[];
  currentState: string;
}): Promise<ClaimIntelligence> {
  // Calculate approval likelihood based on multiple factors
  let approvalScore = 0.5; // baseline 50%

  // Boost from similar successful claims
  const successfulSimilar = params.similarClaims.filter((sc) => sc.score > 0.7).length;
  if (successfulSimilar > 0) {
    approvalScore += 0.2;
  }

  // Boost from rule compliance
  const positiveRules = params.triggeredRules.filter(
    (r) => r.action?.type === "recommend" || r.action?.type === "approve"
  ).length;
  if (positiveRules > 0) {
    approvalScore += 0.15;
  }

  // Penalty from blocking rules
  const negativeRules = params.triggeredRules.filter(
    (r) => r.action?.type === "deny" || r.action?.type === "flag"
  ).length;
  if (negativeRules > 0) {
    approvalScore -= 0.15;
  }

  // State progression boost
  const advancedStates = ["SUBMITTED", "NEGOTIATING", "APPROVED"];
  if (advancedStates.includes(params.currentState)) {
    approvalScore += 0.1;
  }

  // Clamp to 0-1
  approvalScore = Math.max(0, Math.min(1, approvalScore));

  // Calculate risk score (inverse of approval)
  const riskScore = 1 - approvalScore;

  // Supplement success probability
  const supplementSuccessProbability = approvalScore * 0.7; // Supplements are generally harder

  // Recommended strategy
  let recommendedStrategy = "standard_processing";
  if (approvalScore < 0.4) {
    recommendedStrategy = "strengthen_documentation";
  } else if (approvalScore > 0.7) {
    recommendedStrategy = "fast_track";
  }

  // Key factors
  const keyFactors: string[] = [];
  if (successfulSimilar > 0) {
    keyFactors.push(`${successfulSimilar} similar successful claim(s)`);
  }
  if (positiveRules > 0) {
    keyFactors.push(`${positiveRules} supporting rule(s)`);
  }
  if (negativeRules > 0) {
    keyFactors.push(`${negativeRules} blocking rule(s)`);
  }

  return {
    approvalLikelihood: approvalScore,
    supplementSuccessProbability,
    riskScore,
    recommendedStrategy,
    keyFactors,
  };
}

/**
 * Quick check: Should we do anything with this claim right now?
 */
export async function shouldTakeAction(claimId: string): Promise<boolean> {
  const currentState = await getCurrentClaimState(claimId);

  // Don't act on completed claims
  if (currentState === "COMPLETE" || currentState === "PAID") {
    return false;
  }

  // Check if there are pending actions
  const actions = getNextActionsForClaim({
    claimId,
    state: currentState as any,
    rules: [],
  });
  return actions.length > 0;
}
