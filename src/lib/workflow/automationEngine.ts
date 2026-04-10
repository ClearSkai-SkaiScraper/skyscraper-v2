/**
 * Workflow Automation Engine
 *
 * Run automated workflows based on triggers (stages, events, conditions)
 * Uses WorkflowAction table with actionType field
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface WorkflowTrigger {
  type: string;
  entityId: string;
  entityType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
}

export interface WorkflowResult {
  success: boolean;
  workflowsRun: number;
  results: Array<{
    workflowId: string;
    success: boolean;
    error?: string;
  }>;
}

export interface StageContext {
  leadId: string;
  orgId: string;
  stageName: string;
  eventType?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

/**
 * Trigger stage-based workflows
 * Called from /api/workflow/trigger route
 */
export async function triggerStage(context: StageContext): Promise<WorkflowResult> {
  const { leadId, orgId, stageName, eventType, metadata } = context;

  logger.debug(`[WorkflowEngine] Triggering stage: ${stageName} for lead: ${leadId}`);

  // Find pending workflow actions for this lead and action type
  const workflowActions = await prisma.workflowAction.findMany({
    where: {
      orgId,
      leadId,
      actionType: stageName,
      status: "pending",
    },
  });

  const results: WorkflowResult["results"] = [];

  for (const workflow of workflowActions) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config = (workflow.config as Record<string, any>) || {};

      // Execute based on actionType
      switch (workflow.actionType) {
        case "send_email":
          await executeEmailAction(leadId, config, orgId);
          break;
        case "update_status":
          await executeStatusUpdate(leadId, config);
          break;
        case "create_task":
          await executeCreateTask(leadId, config, orgId);
          break;
        case "notify_team":
          await executeNotifyTeam(leadId, config, orgId);
          break;
        case "webhook":
          await executeWebhookAction(leadId, config, metadata);
          break;
        default:
          // Execute generic stage action
          logger.debug(`[WorkflowEngine] Executing generic action: ${workflow.actionType}`);
      }

      // Update workflow action status
      await prisma.workflowAction.update({
        where: { id: workflow.id },
        data: {
          status: "completed",
          executedAt: new Date(),
          result: { success: true, stageName, eventType },
          updatedAt: new Date(),
        },
      });

      results.push({ workflowId: workflow.id, success: true });

      // Log activity
      await prisma.activities.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          type: "workflow_executed",
          title: `Workflow: ${workflow.actionType}`,
          description: `Stage "${stageName}" triggered workflow action: ${workflow.actionType}`,
          userId: "system",
          userName: "Workflow Engine",
          claimId: leadId,
          metadata: { workflowId: workflow.id, stageName, eventType },
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error(`[WorkflowEngine] Failed: ${workflow.actionType}`, error);

      // Update workflow action with failure
      await prisma.workflowAction.update({
        where: { id: workflow.id },
        data: {
          status: "failed",
          executedAt: new Date(),
          result: { error: error instanceof Error ? error.message : "Unknown error" },
          updatedAt: new Date(),
        },
      });

      results.push({
        workflowId: workflow.id,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    success: results.every((r) => r.success),
    workflowsRun: workflowActions.length,
    results,
  };
}

/**
 * Trigger workflows based on event type
 */
export async function triggerWorkflows(trigger: WorkflowTrigger): Promise<WorkflowResult> {
  logger.debug(`[WorkflowEngine] Triggering workflows for ${trigger.type}`);

  return triggerStage({
    leadId: trigger.entityId,
    orgId: trigger.data?.orgId || "",
    stageName: trigger.type,
    metadata: trigger.data,
  });
}

/**
 * Get pending workflow actions for an action type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getActiveWorkflows(actionType: string, orgId: string): Promise<any[]> {
  const workflows = await prisma.workflowAction.findMany({
    where: {
      orgId,
      actionType,
      status: "pending",
    },
    orderBy: { createdAt: "desc" },
  });

  return workflows;
}

/**
 * Execute a specific workflow by ID
 */
export async function executeWorkflow(
  workflowId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const workflow = await prisma.workflowAction.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) {
    return { success: false, error: "Workflow not found" };
  }

  if (workflow.status === "completed") {
    return { success: false, error: "Workflow already completed" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = (workflow.config as Record<string, any>) || {};
  const leadId = context.leadId || context.entityId || workflow.leadId;
  const orgId = workflow.orgId;

  try {
    switch (workflow.actionType) {
      case "send_email":
        await executeEmailAction(leadId, config, orgId);
        break;
      case "update_status":
        await executeStatusUpdate(leadId, config);
        break;
      case "create_task":
        await executeCreateTask(leadId, config, orgId);
        break;
      case "notify_team":
        await executeNotifyTeam(leadId, config, orgId);
        break;
      case "webhook":
        await executeWebhookAction(leadId, config, context);
        break;
    }

    // Mark as completed
    await prisma.workflowAction.update({
      where: { id: workflowId },
      data: {
        status: "completed",
        executedAt: new Date(),
        result: { success: true },
        updatedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    await prisma.workflowAction.update({
      where: { id: workflowId },
      data: {
        status: "failed",
        executedAt: new Date(),
        result: { error: error instanceof Error ? error.message : "Execution failed" },
        updatedAt: new Date(),
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Execution failed",
    };
  }
}

// --- Action Executors ---

async function executeEmailAction(
  leadId: string,
  config: { template?: string; to?: string; subject?: string },
  _orgId: string
) {
  const claim = await prisma.claims.findUnique({
    where: { id: leadId },
    include: { properties: true },
  });

  if (!claim) {
    logger.warn(`[WorkflowEngine] Claim not found for email: ${leadId}`);
    return;
  }

  // Get email from insured_access if available
  let recipientEmail = config.to;
  if (!recipientEmail) {
    const insuredAccess = await prisma.insured_access.findFirst({
      where: { job_id: leadId },
      select: { insured_email: true },
    });
    recipientEmail = insuredAccess?.insured_email;
  }

  if (!recipientEmail) {
    logger.warn(`[WorkflowEngine] No recipient email for ${leadId}`);
    return;
  }

  const notificationId = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "Notification" ("id", "userId", "type", "title", "message", "claimId", "read", "createdAt")
    VALUES (${notificationId}, 'system', 'workflow_email',
      ${config.subject || "Workflow Notification"},
      ${`Email queued to ${recipientEmail}`},
      ${leadId}, false, NOW())
    ON CONFLICT DO NOTHING
  `;

  logger.debug(`[WorkflowEngine] Email queued to ${recipientEmail}`);
}

async function executeStatusUpdate(leadId: string, config: { status?: string }) {
  if (!config.status) return;

  await prisma.claims.update({
    where: { id: leadId },
    data: { status: config.status, updatedAt: new Date() },
  });

  logger.debug(`[WorkflowEngine] Status updated to ${config.status}`);
}

async function executeCreateTask(
  leadId: string,
  config: { title?: string; description?: string; dueInDays?: number; assignedTo?: string },
  orgId: string
) {
  const dueDate = config.dueInDays
    ? new Date(Date.now() + config.dueInDays * 24 * 60 * 60 * 1000)
    : null;

  await prisma.claim_tasks.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: leadId,
      org_id: orgId,
      source: "workflow",
      title: config.title || "Workflow Task",
      description: config.description || "",
      status: "todo",
      assigned_to_id: config.assignedTo || null,
      due_date: dueDate,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  logger.debug(`[WorkflowEngine] Task created: ${config.title}`);
}

async function executeNotifyTeam(
  leadId: string,
  config: { userIds?: string[]; message?: string },
  orgId: string
) {
  const message = config.message || "Workflow notification";

  const recipients =
    config.userIds && config.userIds.length > 0
      ? config.userIds
      : (await prisma.users.findMany({ where: { orgId }, select: { id: true } })).map((u) => u.id);

  for (const userId of recipients) {
    const notificationId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "Notification" ("id", "userId", "type", "title", "message", "claimId", "read", "createdAt")
      VALUES (${notificationId}, ${userId}, 'workflow_notification', 'Workflow Alert',
        ${message}, ${leadId}, false, NOW())
      ON CONFLICT DO NOTHING
    `;
  }

  logger.debug(`[WorkflowEngine] Team notified (${recipients.length} users)`);
}

async function executeWebhookAction(
  leadId: string,
  config: { url?: string; headers?: Record<string, string> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
) {
  if (!config.url) {
    logger.warn("[WorkflowEngine] No webhook URL specified");
    return;
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...config.headers,
    },
    body: JSON.stringify({ leadId, ...metadata }),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status}`);
  }

  logger.debug(`[WorkflowEngine] Webhook sent to ${config.url}`);
}
