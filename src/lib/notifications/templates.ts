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
  CLOSEOUT_REQUESTED: {
    title: "Closeout Requested",
    body: '{{entityType}} "{{entityTitle}}" has been submitted for closeout. Reason: {{reason}}',
    channels: ["in_app", "email"] as const,
  },
  CLOSEOUT_APPROVED: {
    title: "Closeout Approved",
    body: '{{entityType}} "{{entityTitle}}" has been approved and archived.',
    channels: ["in_app"] as const,
  },
  READINESS_THRESHOLD: {
    title: "Packet Ready for Generation",
    body: "Claim {{claimNumber}} has reached {{readiness}}% readiness. Ready to generate packet!",
    channels: ["in_app"] as const,
  },
  WEATHER_SCAN_COMPLETE: {
    title: "Weather Scan Complete",
    body: "Weather verification for claim {{claimNumber}} found {{candidateCount}} candidate DOL date(s). Primary peril: {{peril}}.",
    channels: ["in_app"] as const,
  },
  DOL_UPDATED: {
    title: "Date of Loss Updated",
    body: "Date of Loss on claim {{claimNumber}} has been set to {{newDol}}. Source: {{source}}.",
    channels: ["in_app", "email"] as const,
  },
  WEATHER_REPORT_GENERATED: {
    title: "Weather Report Generated",
    body: "Full weather & loss justification report generated for claim {{claimNumber}}. {{eventCount}} storm events documented.",
    channels: ["in_app"] as const,
  },
  // Storm Detection Notifications
  STORM_DETECTED: {
    title: "⚠️ Storm Detected in Your Area",
    body: "A {{stormType}} storm has been detected near {{city}}. {{propertyCount}} properties may be affected. Max hail: {{hailSize}}, Max wind: {{windSpeed}} mph.",
    channels: ["in_app", "email"] as const,
  },
  STORM_IMPACT_ALERT: {
    title: "🚨 High-Impact Storm Alert",
    body: "Severe weather impacting {{zipCodes}}. {{highRiskCount}} properties at high risk. Recommended action: {{action}}.",
    channels: ["in_app", "email"] as const,
  },
  STORM_ENDED: {
    title: "Storm Event Concluded",
    body: "The {{stormType}} storm near {{city}} has ended. Duration: {{duration}} minutes. Ready to assess {{propertyCount}} affected properties.",
    channels: ["in_app"] as const,
  },
  DOL_VERIFICATION_NEEDED: {
    title: "DOL Verification Required",
    body: "Claim {{claimNumber}} has low DOL confidence ({{confidence}}%). Weather data suggests {{suggestedDOL}} as alternative date.",
    channels: ["in_app"] as const,
  },
  PHOTO_WEATHER_MISMATCH: {
    title: "Photo-Weather Correlation Issue",
    body: "Photos on claim {{claimNumber}} don't align with storm timing. Correlation score: {{score}}%. Review recommended.",
    channels: ["in_app"] as const,
  },
  WEATHER_EVIDENCE_READY: {
    title: "Weather Evidence Package Ready",
    body: "Storm evidence for claim {{claimNumber}} is ready. Grade: {{grade}}. {{eventCount}} supporting weather events documented.",
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
