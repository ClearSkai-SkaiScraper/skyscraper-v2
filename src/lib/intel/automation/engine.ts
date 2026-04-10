// lib/intel/automation/engine.ts
/**
 * 🔥 PHASE 12 - SKAI EXECUTION ENGINE
 *
 * The heart of the autonomous claims system.
 *
 * This orchestrates:
 * 1. Detect triggers
 * 2. Map actions
 * 3. Execute actions
 * 4. Save results
 * 5. Generate intelligence
 */

import { getDelegate } from "@/lib/db/modelAliases";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

import { type DetectedTrigger, detectTriggersForClaim, saveTriggers } from "./detectTriggers";
import { executeCreateAlert, executeCreateRecommendation } from "./executors/alerts";
import { executeClaimsPacket } from "./executors/claimsPacket";
import { executeSendEmail } from "./executors/email";
import { executeFinancialAnalysis } from "./executors/financial";
import { executeForensicWeather } from "./executors/forensicWeather";
import { executeSupplementPacket } from "./executors/supplement";
import { executeCreateTask } from "./executors/tasks";
import { type ActionType, getSortedActions } from "./mapActions";

export interface AutomationResult {
  success: boolean;
  triggersDetected: DetectedTrigger[];
  actionsExecuted: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any[];
}

/**
 * 🔥 MAIN SKAI ENGINE
 * Runs complete automation pipeline for a claim
 */
export async function runSkaiAutomations(
  claimId: string,
  orgId: string
): Promise<AutomationResult> {
  logger.debug(`\n🔥 [SKAI] Starting automation pipeline for claim ${claimId}\n`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors: any[] = [];

  try {
    // ========================================
    // STEP 1: DETECT TRIGGERS
    // ========================================
    logger.debug("[SKAI] STEP 1: Detecting triggers...");
    const triggers = await detectTriggersForClaim(claimId, orgId);

    if (triggers.length === 0) {
      logger.debug("[SKAI] No triggers detected - claim is healthy");
      return {
        success: true,
        triggersDetected: [],
        actionsExecuted: 0,
        results: [],
        errors: [],
      };
    }

    logger.debug(`[SKAI] Found ${triggers.length} triggers:`);
    triggers.forEach((t) => logger.debug(`  - ${t.type} (${t.severity}): ${t.reason}`));

    // Save triggers to database
    await saveTriggers(claimId, orgId, triggers);

    // ========================================
    // STEP 2: MAP & EXECUTE ACTIONS
    // ========================================
    for (const trigger of triggers) {
      logger.debug(`\n[SKAI] Processing trigger: ${trigger.type}`);

      // Get mapped actions
      const actions = getSortedActions(trigger.type);
      logger.debug(`[SKAI] ${actions.length} actions mapped`);

      // Create trigger record
      const triggerRecord = await getDelegate("automation_triggers").create({
        data: {
          orgId,
          claimId,
          triggerType: trigger.type,
          severity: trigger.severity,
          payload: trigger.payload,
          status: "PENDING",
        },
      });

      // Execute each action
      for (const action of actions) {
        try {
          logger.debug(`[SKAI] Executing: ${action.type}`);

          // Create action record
          const actionRecord = await getDelegate("automation_actions").create({
            data: {
              triggerId: triggerRecord.id,
              actionType: action.type,
              status: "RUNNING",
              startedAt: new Date(),
            },
          });

          // Execute the action
          const result = await executeAction(action.type, claimId, orgId, action.config || {});

          // Update action record
          await getDelegate("automation_actions").update({
            where: { id: actionRecord.id },
            data: {
              status: "SUCCESS",
              result,
              completedAt: new Date(),
            },
          });

          results.push({ action: action.type, result });
          logger.debug(`[SKAI] ✅ ${action.type} completed`);
        } catch (error) {
          logger.error(`[SKAI] ❌ ${action.type} failed:`, error);
          errors.push({ action: action.type, error: String(error) });

          // Update action record with error - find by triggerId and actionType
          const failedAction = await getDelegate("automation_actions").findFirst({
            where: { triggerId: triggerRecord.id, actionType: action.type },
          });
          if (failedAction) {
            await getDelegate("automation_actions").update({
              where: { id: failedAction.id },
              data: {
                status: "FAILED",
                errorMessage: String(error),
                completedAt: new Date(),
              },
            });
          }
        }
      }

      // Mark trigger as processed
      await getDelegate("automation_triggers").update({
        where: { id: triggerRecord.id },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
        },
      });
    }

    // ========================================
    // STEP 3: FINAL STATUS LOG
    // ========================================
    await prisma.activities.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        claimId,
        userId: "skai",
        userName: "SkaiPDF",
        type: "automation_run",
        title: "Automation Run Complete",
        description: `SkaiPDF processed ${triggers.length} triggers and executed ${results.length} actions`,
        metadata: {
          triggers: triggers.map((t) => t.type),
          actionsExecuted: results.length,
          errors: errors.length,
        },
        updatedAt: new Date(),
      },
    });

    logger.debug(`\n🔥 [SKAI] Automation complete - ${results.length} actions executed\n`);

    return {
      success: true,
      triggersDetected: triggers,
      actionsExecuted: results.length,
      results,
      errors,
    };
  } catch (error) {
    logger.error("[SKAI] Pipeline failed:", error);
    return {
      success: false,
      triggersDetected: [],
      actionsExecuted: 0,
      results,
      errors: [{ error: String(error) }],
    };
  }
}

/**
 * Execute a single action
 */
async function executeAction(
  actionType: ActionType,
  claimId: string,
  orgId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  switch (actionType) {
    case "GENERATE_FINANCIAL":
      return await executeFinancialAnalysis(claimId, orgId);

    case "GENERATE_CLAIMS_PACKET":
      return await executeClaimsPacket(claimId, orgId);

    case "GENERATE_SUPPLEMENT":
      return await executeSupplementPacket(claimId, orgId);

    case "GENERATE_FORENSIC_WEATHER":
      return await executeForensicWeather(claimId, orgId);

    case "SEND_ADJUSTER_EMAIL":
      return await executeSendEmail(claimId, orgId, "ADJUSTER", config);

    case "SEND_HOMEOWNER_EMAIL":
      return await executeSendEmail(claimId, orgId, "HOMEOWNER", config);

    case "SEND_FOLLOW_UP_EMAIL":
      return await executeSendEmail(claimId, orgId, "ADJUSTER", { ...config, isFollowUp: true });

    case "CREATE_TASK":
      return await executeCreateTask(claimId, orgId, config);

    case "CREATE_ALERT":
      return await executeCreateAlert(claimId, orgId, config);

    case "CREATE_RECOMMENDATION":
      return await executeCreateRecommendation(claimId, orgId, config);

    case "UPDATE_CLAIM_STATUS":
      await prisma.claims.update({
        where: { id: claimId, orgId },
        data: { status: config.newStatus },
      });
      return { status: config.newStatus };

    case "LOG_ACTIVITY":
      await prisma.activities.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          claimId,
          userId: "skai",
          userName: "SkaiPDF",
          type: "skai_action",
          title: config.title || "SkaiPDF Action",
          description: config.description || config.title || "SkaiPDF action",
          metadata: config,
          updatedAt: new Date(),
        },
      });
      return { logged: true };

    case "ESCALATE_TO_MANAGER":
      // Create critical alert + task
      await executeCreateAlert(claimId, orgId, {
        alertType: "ESCALATION",
        title: "🚨 ESCALATION REQUIRED",
        message: config.reason || "Claim requires manager attention",
        severity: "CRITICAL",
      });
      await executeCreateTask(claimId, orgId, {
        title: "Manager Escalation Required",
        description: config.reason,
        priority: "CRITICAL",
        category: "ESCALATION",
      });
      return { escalated: true };

    case "GENERATE_SUPER_PACKET_QUICK":
    case "GENERATE_SUPER_PACKET_STANDARD":
    case "GENERATE_SUPER_PACKET_NUCLEAR":
      // These would call the super packet API
      return { message: "Super packet generation would be triggered" };

    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}

/**
 * Get automation intelligence for a claim (for UI)
 */
export async function getClaimAutomationIntelligence(claimId: string, orgId: string) {
  const [tasks, alerts, recommendations, triggers] = await Promise.all([
    prisma.automation_tasks.findMany({
      where: { claimId, orgId },
      orderBy: { created_at: "desc" },
      take: 20,
    }),
    prisma.automation_alerts.findMany({
      where: { claimId, orgId, is_dismissed: false },
      orderBy: { created_at: "desc" },
      take: 10,
    }),
    prisma.automation_recommendations.findMany({
      where: { claimId, orgId, is_accepted: false, is_dismissed: false },
      orderBy: { created_at: "desc" },
      take: 5,
    }),
    prisma.automation_triggers.findMany({
      where: { claimId, orgId },
      orderBy: { created_at: "desc" },
      take: 10,
    }),
  ]);

  const actions = await prisma.automation_actions.findMany({
    where: { trigger_id: { in: triggers.map((t) => t.id) } },
    orderBy: { started_at: "desc" },
    take: 20,
  });

  return {
    tasks,
    alerts,
    recommendations,
    triggers,
    actions,
    stats: {
      totalTasks: tasks.length,
      openTasks: tasks.filter((t) => t.status === "OPEN").length,
      criticalAlerts: alerts.filter((a) => a.severity === "CRITICAL").length,
      activeRecommendations: recommendations.length,
    },
  };
}
