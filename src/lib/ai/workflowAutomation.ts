/**
 * AI Workflow Automation
 *
 * Intelligent workflow recommendations and auto-routing
 * Smart task delegation, bottleneck detection, optimization
 */

import { callAI } from "@/lib/ai/aiAssistant";
import { logger } from "@/lib/logger";
import { createTask } from "@/lib/tasks/assignment";

export interface WorkflowContext {
  resourceType: "CLAIM" | "JOB" | "INSPECTION";
  resourceId: string;
  currentStatus: string;
  history: WorkflowEvent[];
  assignedTo?: string[];
  dueDate?: Date;
  priority?: string;
}

export interface WorkflowEvent {
  timestamp: Date;
  action: string;
  actor: string;
  details?: string;
}

export interface WorkflowRecommendation {
  action: string;
  reason: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assignTo?: string;
  dueDate?: Date;
  automatable: boolean;
  confidence: number;
}

export interface BottleneckAnalysis {
  location: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  cause: string;
  impact: string;
  recommendations: string[];
}

/**
 * Get AI workflow recommendations
 */
export async function getWorkflowRecommendations(
  context: WorkflowContext
): Promise<WorkflowRecommendation[]> {
  try {
    // Analyze current state
    const stateAnalysis = analyzeCurrentState(context);

    // Get AI recommendations
    const aiRecommendations = await generateAIRecommendations(context, stateAnalysis);

    // Get best assignee suggestions
    const enriched = await enrichWithAssignments(aiRecommendations, context);

    // Sort by priority and confidence
    return enriched.sort((a, b) => {
      const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return b.confidence - a.confidence;
    });
  } catch (error) {
    logger.error("Workflow recommendation failed:", error);
    return [];
  }
}

/**
 * Analyze current workflow state
 */
function analyzeCurrentState(context: WorkflowContext) {
  const now = new Date();
  const createdAt = context.history[0]?.timestamp || now;
  const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  // Check if overdue
  const isOverdue = context.dueDate && context.dueDate < now;

  // Check for stagnation
  const lastUpdate = context.history[context.history.length - 1]?.timestamp || createdAt;
  const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
  const isStagnant = daysSinceUpdate > 7;

  // Check for repeated actions
  const actionCounts: Record<string, number> = {};
  for (const event of context.history) {
    actionCounts[event.action] = (actionCounts[event.action] || 0) + 1;
  }
  const hasRepeatedActions = Object.values(actionCounts).some((count) => count > 3);

  return {
    ageInDays,
    daysSinceUpdate,
    isOverdue,
    isStagnant,
    hasRepeatedActions,
    actionCounts,
    totalEvents: context.history.length,
  };
}

/**
 * Generate AI recommendations
 */
async function generateAIRecommendations(
  context: WorkflowContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysis: any
): Promise<WorkflowRecommendation[]> {
  const prompt = `Analyze this ${context.resourceType} workflow and suggest next actions:

Current Status: ${context.currentStatus}
Age: ${Math.round(analysis.ageInDays)} days
Days Since Last Update: ${Math.round(analysis.daysSinceUpdate)}
${analysis.isOverdue ? "⚠️ OVERDUE" : ""}
${analysis.isStagnant ? "⚠️ STAGNANT (no updates in 7+ days)" : ""}

Recent History:
${context.history
  .slice(-5)
  .map((e) => `- ${e.timestamp.toLocaleDateString()}: ${e.action} by ${e.actor}`)
  .join("\n")}

Suggest 3-5 next actions as JSON array:
[
  {
    "action": "Clear action description",
    "reason": "Why this action is needed",
    "priority": "LOW|MEDIUM|HIGH|URGENT",
    "automatable": true|false,
    "confidence": 85
  }
]

Consider:
- Current bottlenecks
- Required documentation
- Approval workflows
- Customer communication
- Timeline risks`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await callAI(prompt, { maxTokens: 1500 } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recommendations = JSON.parse((response as any).content || response.result);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return recommendations.map((rec: any) => ({
      ...rec,
      assignTo: undefined,
      dueDate: undefined,
    }));
  } catch (error) {
    logger.error("AI recommendation generation failed:", error);
    return getFallbackRecommendations(context, analysis);
  }
}

/**
 * Fallback recommendations
 */
function getFallbackRecommendations(
  context: WorkflowContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysis: any
): WorkflowRecommendation[] {
  const recommendations: WorkflowRecommendation[] = [];

  if (analysis.isOverdue) {
    recommendations.push({
      action: "Address overdue status immediately",
      reason: "This item is past its due date and requires attention",
      priority: "URGENT",
      automatable: false,
      confidence: 95,
    });
  }

  if (analysis.isStagnant) {
    recommendations.push({
      action: "Review and update status",
      reason: "No activity in over 7 days",
      priority: "HIGH",
      automatable: false,
      confidence: 90,
    });
  }

  if (context.currentStatus === "NEW") {
    recommendations.push({
      action: "Begin initial assessment",
      reason: "New item needs review and triage",
      priority: "MEDIUM",
      automatable: true,
      confidence: 85,
    });
  }

  return recommendations;
}

/**
 * Enrich recommendations with assignment suggestions
 */
async function enrichWithAssignments(
  recommendations: WorkflowRecommendation[],
  context: WorkflowContext
): Promise<WorkflowRecommendation[]> {
  for (const rec of recommendations) {
    // Suggest assignee based on action type
    const assignee = await suggestBestAssignee(rec.action, context);
    if (assignee) {
      rec.assignTo = assignee;
    }

    // Suggest due date based on priority
    rec.dueDate = suggestDueDate(rec.priority);
  }

  return recommendations;
}

/**
 * Suggest best assignee for action
 */
async function suggestBestAssignee(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  action: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: WorkflowContext
): Promise<string | undefined> {
  try {
    // TODO: Implement smart assignment based on:
    // - Team member skills
    // - Current workload
    // - Past performance
    // - Action type requirements

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Suggest due date based on priority
 */
function suggestDueDate(priority: string): Date {
  const now = new Date();
  const daysToAdd =
    {
      URGENT: 1,
      HIGH: 3,
      MEDIUM: 7,
      LOW: 14,
    }[priority] || 7;

  now.setDate(now.getDate() + daysToAdd);
  return now;
}

/**
 * Auto-execute workflow recommendations
 */
export async function executeWorkflowRecommendations(
  orgId: string,
  context: WorkflowContext,
  recommendations: WorkflowRecommendation[],
  autoExecute: boolean = false
): Promise<{ executed: number; skipped: number; errors: number }> {
  let executed = 0;
  let skipped = 0;
  let errors = 0;

  for (const rec of recommendations) {
    try {
      if (!autoExecute && !rec.automatable) {
        skipped++;
        continue;
      }

      // Execute automatable actions
      if (rec.automatable) {
        await executeAutomatableAction(orgId, context, rec);
        executed++;
      } else {
        // Create task for manual actions
        if (rec.assignTo) {
          await createTask(orgId, {
            title: rec.action,
            description: rec.reason,
            assignedTo: rec.assignTo,
            assignedBy: "SYSTEM",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            priority: rec.priority as any,
            dueDate: rec.dueDate,
            relatedTo: {
              type: context.resourceType,
              id: context.resourceId,
            },
          });
          executed++;
        } else {
          skipped++;
        }
      }
    } catch (error) {
      logger.error("Action execution failed:", error);
      errors++;
    }
  }

  return { executed, skipped, errors };
}

/**
 * Execute automatable action
 */
async function executeAutomatableAction(
  orgId: string,
  context: WorkflowContext,
  recommendation: WorkflowRecommendation
): Promise<void> {
  // TODO: Implement automation based on action type
  logger.debug(`🤖 Auto-executing: ${recommendation.action}`);
}

/**
 * Detect workflow bottlenecks
 * DEPRECATED: activity_log model doesn't exist in schema.
 */
export async function detectBottlenecks(
  orgId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  timeWindow: { start: Date; end: Date }
): Promise<BottleneckAnalysis[]> {
  // activity_log model doesn't exist in schema
  logger.debug(`[workflowAutomation] Would detect bottlenecks for org ${orgId}`);
  return [];
}

/**
 * Optimize workflow routing
 */
export async function optimizeWorkflowRouting(orgId: string): Promise<{
  currentEfficiency: number;
  optimizationSuggestions: string[];
  projectedImprovement: number;
}> {
  try {
    // Analyze current routing patterns
    const patterns = await analyzeRoutingPatterns(orgId);

    // Calculate efficiency metrics
    const currentEfficiency = calculateEfficiency(patterns);

    // Generate optimization suggestions
    const suggestions = generateOptimizationSuggestions(patterns);

    // Estimate improvement potential
    const projectedImprovement = estimateImprovement(suggestions);

    return {
      currentEfficiency,
      optimizationSuggestions: suggestions,
      projectedImprovement,
    };
  } catch (error) {
    logger.error("Workflow optimization failed:", error);
    return {
      currentEfficiency: 0,
      optimizationSuggestions: [],
      projectedImprovement: 0,
    };
  }
}

/**
 * Analyze routing patterns
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function analyzeRoutingPatterns(orgId: string) {
  // TODO: Implement pattern analysis
  return {
    totalWorkflows: 0,
    averageCompletionTime: 0,
    commonPaths: [],
    inefficientPaths: [],
  };
}

/**
 * Calculate workflow efficiency
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function calculateEfficiency(patterns: any): number {
  // Simple efficiency calculation (0-100)
  return 75; // Placeholder
}

/**
 * Generate optimization suggestions
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function generateOptimizationSuggestions(patterns: any): string[] {
  return [
    "Automate status transitions for common workflows",
    "Reduce approval steps for low-value items",
    "Implement parallel processing for independent tasks",
    "Add automated reminders for overdue items",
  ];
}

/**
 * Estimate improvement potential
 */
function estimateImprovement(suggestions: string[]): number {
  // Estimate improvement percentage
  return suggestions.length * 5; // 5% per suggestion
}
