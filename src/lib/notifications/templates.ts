/**
 * Notification Templates
 *
 * Templated notification sending
 */

import { logger } from "@/lib/logger";
import { sendNotification } from "./sendNotification";

export const NOTIFICATION_TEMPLATES = {
  TASK_ASSIGNED: {
    title: "New Task Assigned",
    body: "You have been assigned a new task: {{taskName}}",
    channels: ["in_app", "email"] as const,
  },
  TASK_COMPLETED: {
    title: "Task Completed",
    body: "Task '{{taskName}}' has been marked as complete",
    channels: ["in_app"] as const,
  },
  CLAIM_UPDATED: {
    title: "Claim Updated",
    body: "Claim {{claimNumber}} has been updated",
    channels: ["in_app"] as const,
  },
  CLAIM_STATUS_CHANGE: {
    title: "Claim Status Changed",
    body: "Claim {{claimNumber}} status changed to {{newStatus}}",
    channels: ["in_app", "email"] as const,
  },
  REPORT_READY: {
    title: "Report Ready",
    body: "Your report is ready for download",
    channels: ["in_app", "email"] as const,
  },
  CONTRACTOR_ASSIGNED: {
    title: "Contractor Assigned",
    body: "{{contractorName}} has been assigned to your claim",
    channels: ["in_app", "email"] as const,
  },
  DOCUMENT_SIGNED: {
    title: "Document Signed",
    body: "{{documentName}} has been signed and finalized",
    channels: ["in_app", "email"] as const,
  },
  PAYMENT_RECEIVED: {
    title: "Payment Received",
    body: "Payment of ${{amount}} received for {{claimNumber}}",
    channels: ["in_app", "email"] as const,
  },
  TEAM_INVITE: {
    title: "Team Invitation",
    body: "You've been invited to join {{companyName}}",
    channels: ["in_app", "email"] as const,
  },
};

export type NotificationTemplateName = keyof typeof NOTIFICATION_TEMPLATES;

/**
 * Send a templated notification
 */
export async function sendTemplatedNotification(
  templateName: NotificationTemplateName,
  userId: string,
  data: Record<string, any>
): Promise<boolean> {
  const template = NOTIFICATION_TEMPLATES[templateName];
  if (!template) {
    logger.error(`[NotificationTemplates] Unknown template: ${templateName}`);
    return false;
  }

  // Replace placeholders in title and body
  let title = template.title;
  let body = template.body;

  for (const [key, value] of Object.entries(data)) {
    title = title.replace(`{{${key}}}`, String(value || ""));
    body = body.replace(`{{${key}}}`, String(value || ""));
  }

  return sendNotification(
    {
      userId,
      type: templateName,
      title,
      body,
      metadata: data,
    },
    { channels: [...template.channels] }
  );
}

/**
 * Get available templates
 */
export function getAvailableTemplates(): NotificationTemplateName[] {
  return Object.keys(NOTIFICATION_TEMPLATES) as NotificationTemplateName[];
}
