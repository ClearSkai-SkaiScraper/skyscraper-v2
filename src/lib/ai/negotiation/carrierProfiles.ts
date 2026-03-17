/**
 * Carrier Negotiation Profiles
 *
 * Learned strategies for negotiating with specific insurance carriers.
 * Each carrier has unique patterns, denials, and preferences.
 *
 * NOTE: This module returns stub data as NegotiationStrategy model
 * is not yet defined in the Prisma schema. Uses CarrierProfile for
 * basic carrier info when available.
 */

import { logger } from "@/lib/logger";

import { NegotiationSuggestion } from "../types";

// Default negotiation patterns by carrier type (stub data)
const DEFAULT_STRATEGIES: Record<
  string,
  { summary: string; tactics: string[]; riskLevel: string }
> = {
  "State Farm": {
    summary: "State Farm typically responds well to documented evidence and itemized breakdowns.",
    tactics: [
      "Provide detailed photo documentation",
      "Reference specific policy provisions",
      "Itemize all line items clearly",
    ],
    riskLevel: "low",
  },
  Allstate: {
    summary: "Allstate requires thorough documentation and may push back on scope.",
    tactics: [
      "Include industry standards references",
      "Document pre-loss condition",
      "Provide comparable pricing",
    ],
    riskLevel: "medium",
  },
  default: {
    summary: "Standard negotiation approach with emphasis on documentation.",
    tactics: ["Document thoroughly", "Reference policy terms", "Provide supporting evidence"],
    riskLevel: "medium",
  },
};

/**
 * Get negotiation strategy for a specific carrier
 */
export async function getCarrierStrategy(carrier: string): Promise<NegotiationSuggestion | null> {
  // Return stub strategy based on carrier name
  const strategyData = DEFAULT_STRATEGIES[carrier] || DEFAULT_STRATEGIES["default"];

  return {
    summary: strategyData.summary,
    steps: [
      `Review ${carrier} policy provisions`,
      "Gather all supporting documentation",
      "Prepare itemized estimate breakdown",
      "Schedule adjuster meeting if needed",
    ],
    expectedImpact: "Improves expected payout by following carrier-specific best practices",
    tactics: strategyData.tactics,
    riskLevel: strategyData.riskLevel as "low" | "medium" | "high",
  };
}

/**
 * Get all carrier strategies
 */
export async function getAllCarrierStrategies() {
  // Return stub data for known carriers
  return Object.entries(DEFAULT_STRATEGIES)
    .filter(([key]) => key !== "default")
    .map(([carrier, data]) => ({
      carrier,
      summary: data.summary,
      utilityBoost: 0.15, // Default 15% estimated improvement
    }));
}

/**
 * Create or update carrier strategy
 * NOTE: Stub implementation - data is not persisted until NegotiationStrategy model is added
 */
export async function upsertCarrierStrategy(
  carrier: string,
  data: {
    pattern: unknown;
    recommendedActions: unknown;
    utilityBoost?: number;
  }
) {
  // Stub: Log the intent but don't persist
  console.log(`[carrierProfiles] Would upsert strategy for ${carrier}:`, {
    pattern: data.pattern,
    utilityBoost: data.utilityBoost,
  });

  // Return a mock response
  return {
    id: `stub-${carrier.toLowerCase().replace(/\s+/g, "-")}`,
    carrier,
    pattern: data.pattern,
    recommendedActions: data.recommendedActions,
    utilityBoost: data.utilityBoost ?? 0.1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Learn strategy from successful outcomes
 */
export async function learnFromSuccess(carrier: string, successfulActions: string[]) {
  // Analyze what worked and update strategy
  // This would aggregate patterns from AIActions with positive outcomes
  // Placeholder for now
  logger.debug(`Learning from success with ${carrier}:`, successfulActions);
}
