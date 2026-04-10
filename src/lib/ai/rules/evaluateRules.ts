/**
 * Evaluate Rules - High-level wrapper
 *
 * Simplified interface for evaluating rules against claims.
 */

import { buildClaimContext } from "@/lib/claim/buildClaimContext";

import { ClaimContext, RuleDefinition } from "../types";
import { evaluateRulesForClaim, executeRuleActions } from "./ruleEngine";

/**
 * Evaluate claim rules and return both triggered rules and recommended actions
 */
export async function evaluateClaimRules(
  claimId: string,
  claimContext?: ClaimContext
): Promise<{
  triggered: RuleDefinition[];
  actions: string[];
}> {
  // If no context provided, build it from claim data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let context: any = claimContext;
  if (!context) {
    context = await buildClaimContext(claimId);
    if (context) context.claimId = claimId;
  }

  const triggered = await evaluateRulesForClaim(context!);
  const actions = executeRuleActions(triggered);

  return {
    triggered,
    actions,
  };
}

// Use canonical buildClaimContext from @/lib/claim/buildClaimContext
