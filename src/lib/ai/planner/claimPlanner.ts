/**
 * Claim Planner
 *
 * AI-powered planning system that suggests next best actions for claims.
 * Combines state machine logic with rules and historical data.
 */

import { ClaimContext,ClaimStateEnum, NextActionSuggestion, RuleDefinition } from "../types";
import { getAllowedNextStates } from "./stateMachine";

interface PlannerContext {
  claimId: string;
  state: ClaimStateEnum | null;
  rules: RuleDefinition[];
  claimData?: ClaimContext;
}

/**
 * Generate list of next action suggestions for a claim
 */
export function getNextActionsForClaim(ctx: PlannerContext): NextActionSuggestion[] {
  const nextStates = getAllowedNextStates(ctx.state);
  const suggestions: NextActionSuggestion[] = [];

  // Generate suggestions based on state transitions
  for (const state of nextStates) {
    const stateActions = getActionsForState(state, ctx);
    suggestions.push(...stateActions);
  }

  // Add rule-based suggestions
  const ruleActions = getActionsFromRules(ctx.rules, ctx);
  suggestions.push(...ruleActions);

  // Sort by priority
  suggestions.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return suggestions;
}

/**
 * Get recommended actions for transitioning to a specific state
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getActionsForState(state: ClaimStateEnum, ctx: PlannerContext): NextActionSuggestion[] {
  const actions: NextActionSuggestion[] = [];

  switch (state) {
    case "INSPECTED":
      actions.push({
        id: "schedule_inspection",
        label: "Schedule Property Inspection",
        description: "Book a site visit and attach initial damage photos.",
        priority: "high",
        actionType: "schedule_inspection",
        estimatedTime: "30 minutes",
        requiredData: ["property_address", "contact_info"],
      });
      break;

    case "ESTIMATE_DRAFTED":
      actions.push({
        id: "generate_estimate",
        label: "Generate AI Estimate",
        description: "Use AI Claims Builder to draft the initial scope and pricing.",
        priority: "high",
        actionType: "generate_estimate",
        estimatedTime: "10-15 minutes",
        requiredData: ["photos", "damage_assessment"],
      });
      break;

    case "SUBMITTED":
      actions.push({
        id: "submit_to_carrier",
        label: "Submit to Insurance Carrier",
        description: "Upload estimate, photos, code compliance docs, and supporting materials.",
        priority: "high",
        actionType: "submit_to_carrier",
        estimatedTime: "15-20 minutes",
        requiredData: ["estimate", "photos", "code_docs"],
      });
      break;

    case "NEGOTIATING":
      actions.push({
        id: "prepare_supplement",
        label: "Prepare Supplement Letter",
        description: "Use AI Appeals to prepare supplement or rebuttal with code citations.",
        priority: "medium",
        actionType: "prepare_supplement",
        estimatedTime: "20-30 minutes",
        requiredData: ["denial_reason", "code_requirements"],
      });
      break;

    case "APPROVED":
      actions.push({
        id: "start_production",
        label: "Begin Production",
        description: "Schedule work, order materials, assign crew.",
        priority: "high",
        actionType: "start_production",
        estimatedTime: "1-2 hours",
        requiredData: ["approved_scope", "material_list"],
      });
      break;

    case "COMPLETE":
      actions.push({
        id: "final_inspection",
        label: "Schedule Final Inspection",
        description: "Book final walkthrough and collect completion photos.",
        priority: "high",
        actionType: "final_inspection",
        estimatedTime: "1 hour",
      });
      break;

    case "PAID":
      actions.push({
        id: "close_claim",
        label: "Close Claim",
        description: "Archive documentation and mark project complete.",
        priority: "medium",
        actionType: "close_claim",
        estimatedTime: "10 minutes",
      });
      break;
  }

  return actions;
}

/**
 * Extract action suggestions from triggered rules
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getActionsFromRules(rules: RuleDefinition[], ctx: PlannerContext): NextActionSuggestion[] {
  const actions: NextActionSuggestion[] = [];

  for (const rule of rules) {
    if (rule.action && typeof rule.action === "object") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ruleAction = rule.action as any;

      if (ruleAction.type === "flag_risk") {
        actions.push({
          id: `rule_${rule.id}_risk`,
          label: "Address Risk Flag",
          description: ruleAction.message || `Rule triggered: ${rule.name}`,
          priority: "high",
          actionType: "address_risk",
        });
      }

      if (ruleAction.type === "require_document") {
        actions.push({
          id: `rule_${rule.id}_doc`,
          label: "Upload Required Document",
          description: ruleAction.documentType || `Document required by: ${rule.name}`,
          priority: "medium",
          actionType: "upload_document",
        });
      }

      if (ruleAction.type === "add_line_item") {
        actions.push({
          id: `rule_${rule.id}_item`,
          label: "Add Recommended Line Item",
          description: ruleAction.itemName || `Item suggested by: ${rule.name}`,
          priority: "low",
          actionType: "add_line_item",
        });
      }
    }
  }

  return actions;
}

/**
 * Prioritize actions based on urgency, dependencies, and expected value
 */
export function prioritizeActions(
  actions: NextActionSuggestion[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  claimContext?: ClaimContext
): NextActionSuggestion[] {
  // Sort by priority first
  const sorted = [...actions].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // TODO: Add more sophisticated prioritization based on:
  // - Dependencies (some actions must happen before others)
  // - Expected value ($ impact)
  // - Time constraints (deadlines)
  // - Resource availability

  return sorted;
}
