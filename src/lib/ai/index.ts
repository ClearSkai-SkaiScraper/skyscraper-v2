/**
 * AI System - Central Export
 *
 * Main entry point for all AI capabilities.
 * Provides unified access to core AI modules through the router.
 */

export * from "./router";

// ============================================
// AI INTELLIGENCE CORE - NEW ORCHESTRATION LAYER
// ============================================

// Main orchestrator
export { orchestrateClaim, shouldTakeAction } from "./orchestrator/orchestrateClaim";
export type { OrchestratorInput, OrchestratorOutput } from "./orchestrator/orchestrateClaim";

// Intelligence types
export * from "./types";

// Agents
export { createAgent, getAgentById, getAgentByName, getAllAgents } from "./agents";
export { calculateUtility, selectBestAction } from "./agents/utilityFunctions";

// Rules
export { evaluateClaimRules } from "./rules/evaluateRules";
export { createRule, evaluateRulesForClaim, getAllRules } from "./rules/ruleEngine";

// State Machine
export {
  getAllowedNextStates,
  getClaimStateHistory,
  getCurrentClaimState,
  transitionClaimState,
} from "./planner/stateMachine";

// Planner
export { getNextActionsForClaim } from "./planner/claimPlanner";

// Feedback
export { getAgentActions, getClaimActions, logAIAction } from "./feedback/logAction";

// Similarity & Intelligence
export {
  embedClaim,
  embedOrgClaims,
  findSimilarClaims,
  findSimilarClaimsByText,
  getEmbeddingStatus,
} from "./intelligence/claimSimilarity";

// Legacy compatibility aliases
export { createOrUpdateClaimEmbedding, generateMissingEmbeddings } from "./similarity/embedClaim";
export { getSimilarClaimsWithDetails } from "./similarity/querySimilarClaims";

// Explanations
export {
  buildExplanation,
  getExplanation,
  saveExplanation,
} from "./explanations/generateExplanation";

// Learning
export { computeDiff, extractMeaningfulEdits } from "./preferences/diffTools";

// Negotiation
export {
  getAllCarrierStrategies,
  getCarrierStrategy,
  upsertCarrierStrategy,
} from "./negotiation/carrierProfiles";
export { getNegotiationSuggestions } from "./negotiation/strategyEngine";
