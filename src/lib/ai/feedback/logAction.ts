/**
 * AI Action Logging
 *
 * Track all AI actions for learning and analysis.
 * Every AI-generated output should be logged here.
 *
 * NOTE: This module provides stub implementations as the ai_actions table
 * is not yet in the schema. Actions are logged to console for now.
 * TODO: Create ai_actions migration when ready to persist action history.
 */

import { logger } from "@/lib/logger";

export interface LogAIActionParams {
  claimId: string;
  agentId: string;
  actionType: string;
  inputData: unknown;
  outputData: unknown;
}

export interface AIAction {
  id: string;
  claim_id: string;
  agent_id: string;
  action_type: string;
  input_data: unknown;
  output_data: unknown;
  created_at: Date;
}

/**
 * Log an AI action (estimate generation, letter generation, etc.)
 * Currently a stub - logs to console until ai_actions table is created.
 */
export async function logAIAction(params: LogAIActionParams): Promise<AIAction> {
  const action: AIAction = {
    id: `action_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    claim_id: params.claimId,
    agent_id: params.agentId,
    action_type: params.actionType,
    input_data: params.inputData,
    output_data: params.outputData,
    created_at: new Date(),
  };

  logger.info(
    `[AI_ACTION] ${params.actionType} for claim ${params.claimId} by agent ${params.agentId}`
  );
  return action;
}

/**
 * Get all actions for a claim
 * Currently returns empty array - stub implementation.
 */
export async function getClaimActions(_claimId: string): Promise<AIAction[]> {
  // TODO: Query ai_actions table when created
  return [];
}

/**
 * Get actions by agent
 * Currently returns empty array - stub implementation.
 */
export async function getAgentActions(_agentId: string, _limit = 100): Promise<AIAction[]> {
  // TODO: Query ai_actions table when created
  return [];
}

/**
 * Get action by ID
 * Currently returns null - stub implementation.
 */
export async function getActionById(_actionId: string): Promise<AIAction | null> {
  // TODO: Query ai_actions table when created
  return null;
}
