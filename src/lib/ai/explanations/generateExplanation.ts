/**
 * AI Explanation Generation
 *
 * Generate human-readable explanations for AI decisions.
 * Critical for transparency, trust, and debugging.
 */

import { logger } from "@/lib/logger";

import { ExplanationPayload, RuleDefinition } from "../types";

export interface ExplanationContext {
  claimId: string;
  rules: RuleDefinition[];
  similarCases: { claimId: string; score: number }[];
  actionType: string;
  confidence?: number;
}

/**
 * Build comprehensive explanation for an AI decision
 */
export function buildExplanation(ctx: ExplanationContext): ExplanationPayload {
  const ruleNames = ctx.rules.map((r) => r.name);
  const similarIds = ctx.similarCases.map((c) => c.claimId);

  const reasoningParts: string[] = [];

  // Explain action type
  reasoningParts.push(`Recommendation: ${formatActionType(ctx.actionType)}.`);

  // Explain rules used
  if (ruleNames.length > 0) {
    reasoningParts.push(
      `This recommendation is based on ${ruleNames.length} business rule(s): ${ruleNames.join(", ")}.`
    );
  }

  // Explain similar cases
  if (similarIds.length > 0) {
    reasoningParts.push(
      `We also analyzed ${similarIds.length} similar claim(s) to inform this suggestion.`
    );

    const topSimilar = ctx.similarCases[0];
    if (topSimilar && topSimilar.score > 0.8) {
      reasoningParts.push(
        `The most similar claim (${Math.round(topSimilar.score * 100)}% match) had a successful outcome.`
      );
    }
  }

  // Add confidence if available
  if (ctx.confidence !== undefined) {
    const confidencePct = Math.round(ctx.confidence * 100);
    reasoningParts.push(`Confidence level: ${confidencePct}%`);
  }

  // Fallback reasoning
  const reasoning =
    reasoningParts.length > 0
      ? reasoningParts.join(" ")
      : "This suggestion is based on general best practices encoded in the system.";

  return {
    reasoning,
    rulesUsed: ctx.rules.map((r) => r.id),
    similarCases: ctx.similarCases,
    confidenceScore: ctx.confidence,
  };
}

/**
 * Save explanation to database
 * DEPRECATED: aIExplanation model doesn't exist in schema.
 */
export async function saveExplanation(actionId: string, explanation: ExplanationPayload) {
  // aIExplanation model doesn't exist in schema
  logger.debug(`[explanations] Would save explanation for action ${actionId}`);
  return null;
}

/**
 * Get explanation for an action
 * DEPRECATED: aIExplanation model doesn't exist in schema.
 */
export async function getExplanation(actionId: string) {
  // aIExplanation model doesn't exist in schema
  logger.debug(`[explanations] Would get explanation for action ${actionId}`);
  return null;
}

/**
 * Format action type for human readability
 */
function formatActionType(actionType: string): string {
  const formatted: Record<string, string> = {
    generate_estimate: "Generate Initial Estimate",
    generate_letter: "Generate Appeal Letter",
    recommend_next_step: "Recommend Next Steps",
    schedule_inspection: "Schedule Property Inspection",
    submit_to_carrier: "Submit to Insurance Carrier",
    prepare_supplement: "Prepare Supplement Documentation",
    negotiate: "Initiate Negotiation",
  };

  return formatted[actionType] || actionType;
}
