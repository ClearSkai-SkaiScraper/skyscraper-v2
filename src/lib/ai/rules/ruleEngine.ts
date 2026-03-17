/**
 * Rules Engine
 *
 * DEPRECATED: rule model doesn't exist in schema.
 */

import { logger } from "@/lib/logger";

import { ClaimContext, RuleDefinition } from "../types";

/**
 * Get all active rules
 */
export async function getAllRules(): Promise<RuleDefinition[]> {
  // rule model doesn't exist in schema
  logger.debug("[ruleEngine] Would fetch rules from database");
  return [];
}

/**
 * Evaluate all rules against a claim context
 * Returns list of rules that were triggered
 */
export async function evaluateRulesForClaim(claimContext: ClaimContext): Promise<RuleDefinition[]> {
  const rules = await getAllRules();
  const triggered: RuleDefinition[] = [];

  for (const rule of rules) {
    if (doesRuleTrigger(rule.trigger, claimContext)) {
      triggered.push(rule);
    }
  }

  return triggered;
}

/**
 * Check if a single rule's trigger conditions are met
 */
function doesRuleTrigger(trigger: any, ctx: ClaimContext): boolean {
  if (!trigger) return false;
  if (trigger.always === true) return true;

  // Handle "all" operator (AND logic)
  if (trigger.all && Array.isArray(trigger.all)) {
    return trigger.all.every((cond: any) => evaluateCondition(cond, ctx));
  }

  // Handle "any" operator (OR logic)
  if (trigger.any && Array.isArray(trigger.any)) {
    return trigger.any.some((cond: any) => evaluateCondition(cond, ctx));
  }

  // Single condition
  return evaluateCondition(trigger, ctx);
}

/**
 * Evaluate a single condition against context
 */
function evaluateCondition(condition: any, ctx: ClaimContext): boolean {
  const { path, op, value } = condition;

  // Get value from context using path (e.g., "roof.slope")
  const contextValue = getValueByPath(ctx, path);

  if (contextValue === undefined) return false;

  // Evaluate operator
  switch (op) {
    case ">":
      return Number(contextValue) > Number(value);
    case ">=":
      return Number(contextValue) >= Number(value);
    case "<":
      return Number(contextValue) < Number(value);
    case "<=":
      return Number(contextValue) <= Number(value);
    case "==":
    case "===":
      return contextValue === value;
    case "!=":
    case "!==":
      return contextValue !== value;
    case "contains":
      return String(contextValue).includes(String(value));
    case "in":
      return Array.isArray(value) && value.includes(contextValue);
    default:
      return false;
  }
}

/**
 * Get nested value from object using dot notation path
 */
function getValueByPath(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Execute rule actions (returns list of recommended actions)
 */
export function executeRuleActions(rules: RuleDefinition[]): string[] {
  const actions: string[] = [];

  for (const rule of rules) {
    if (rule.action && typeof rule.action === "object") {
      if (rule.action.type) {
        actions.push(rule.action.type);
      }
      if (rule.action.actions && Array.isArray(rule.action.actions)) {
        actions.push(...rule.action.actions);
      }
    }
  }

  return actions;
}

/**
 * Create a new rule
 * DEPRECATED: rule model doesn't exist in schema.
 */
export async function createRule(data: Omit<RuleDefinition, "id">): Promise<RuleDefinition> {
  // rule model doesn't exist in schema
  logger.debug(`[ruleEngine] Would create rule ${data.name}`);
  throw new Error("Rule creation not available - model requires schema updates");
}
