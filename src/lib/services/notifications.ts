/**
 * Notification Engine Service
 * Handles email and SMS notifications for maintenance reminders,
 * work orders, inspection alerts, and property updates
 */

import { Resend } from "resend";

import { shouldSendEmail, shouldSendSMS } from "@/lib/demoMode";
import { logger } from "@/lib/logger";

// Initialize email service (Resend)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Twilio for SMS (if configured)
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

interface EmailNotification {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

interface SMSNotification {
  to: string;
  message: string;
}

interface MaintenanceReminderData {
  propertyAddress: string;
  taskName: string;
  scheduledDate: Date;
  vendorName?: string;
  estimatedCost?: number;
}

interface InspectionAlertData {
  propertyAddress: string;
  componentType: string;
  severity: string;
  detectionsCount: number;
  criticalIssues?: string[];
}

/**
 * Send email notification
 */
export async function sendEmail(notification: EmailNotification): Promise<boolean> {
  // Block emails in demo mode
  if (!shouldSendEmail()) {
    logger.debug("📧 [DEMO MODE] Email blocked:", notification.subject);
    return true; // Return success to avoid breaking flows
  }

  if (!resend) {
    logger.warn("Resend API key not configured, skipping email");
    return false;
  }

  try {
    await resend.emails.send({
      from: notification.from || "PreLoss Vision <notifications@preloss.com>",
      to: notification.to,
      subject: notification.subject,
      html: notification.html,
    });

    return true;
  } catch (error) {
    logger.error("Email send error:", error);
    return false;
  }
}

/**
 * Send SMS notification via Twilio
 */
export async function sendSMS(notification: SMSNotification): Promise<boolean> {
  // Block SMS in demo mode
  if (!shouldSendSMS()) {
    logger.debug("📱 [DEMO MODE] SMS blocked:", notification.to);
    return true; // Return success to avoid breaking flows
  }

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    logger.warn("Twilio not configured, skipping SMS");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: twilioPhoneNumber,
          To: notification.to,
          Body: notification.message,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Twilio API error: ${response.status}`);
    }

    return true;
  } catch (error) {
    logger.error("SMS send error:", error);
    return false;
  }
}

/**
 * Send maintenance reminder to homeowner
 */
export async function sendMaintenanceReminder(
  email: string,
  phone: string | null,
  data: MaintenanceReminderData
): Promise<void> {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏠 Maintenance Reminder</h1>
        </div>
        <div class="content">
          <h2>Upcoming Maintenance Task</h2>
          <p><strong>Property:</strong> ${data.propertyAddress}</p>
          <p><strong>Task:</strong> ${data.taskName}</p>
          <p><strong>Scheduled Date:</strong> ${data.scheduledDate.toLocaleDateString()}</p>
          ${data.vendorName ? `<p><strong>Vendor:</strong> ${data.vendorName}</p>` : ""}
          ${data.estimatedCost ? `<p><strong>Estimated Cost:</strong> $${(data.estimatedCost / 100).toFixed(2)}</p>` : ""}
          <p>Please ensure access to the property and notify us if you need to reschedule.</p>
          <a href="https://app.preloss.com/maintenance" class="button">View Details</a>
        </div>
        <div class="footer">
          <p>This is an automated reminder from PreLoss Vision</p>
          <p>If you have questions, please contact your property manager</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send email
  await sendEmail({
    to: email,
    subject: `Maintenance Reminder: ${data.taskName}`,
    html: emailHtml,
  });

  // Send SMS if phone provided
  if (phone) {
    await sendSMS({
      to: phone,
      message: `Maintenance Reminder: ${data.taskName} scheduled for ${data.scheduledDate.toLocaleDateString()} at ${data.propertyAddress}. View details: https://app.preloss.com/maintenance`,
    });
  }
}

/**
 * Send work order notification to vendor
 */
export async function sendVendorWorkOrder(
  vendorEmail: string,
  vendorPhone: string | null,
  data: {
    workOrderId: string;
    propertyAddress: string;
    taskName: string;
    description?: string;
    scheduledDate: Date;
    priority: string;
  }
): Promise<void> {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .priority-high { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
        .priority-medium { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
        .priority-low { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
        .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Work Order</h1>
        </div>
        <div class="content">
          <h2>Work Order #${data.workOrderId}</h2>
          <div class="priority-${data.priority.toLowerCase()}">
            <strong>Priority:</strong> ${data.priority}
          </div>
          <p><strong>Property:</strong> ${data.propertyAddress}</p>
          <p><strong>Task:</strong> ${data.taskName}</p>
          ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ""}
          <p><strong>Scheduled Date:</strong> ${data.scheduledDate.toLocaleDateString()}</p>
          <p>Please confirm your availability and review the work order details.</p>
          <a href="https://app.preloss.com/maintenance/tasks/${data.workOrderId}" class="button">Accept Work Order</a>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send email
  await sendEmail({
    to: vendorEmail,
    subject: `New Work Order: ${data.taskName} - ${data.priority} Priority`,
    html: emailHtml,
  });

  // Send SMS
  if (vendorPhone) {
    await sendSMS({
      to: vendorPhone,
      message: `New ${data.priority} priority work order: ${data.taskName} at ${data.propertyAddress} on ${data.scheduledDate.toLocaleDateString()}. Accept: https://app.preloss.com/maintenance/tasks/${data.workOrderId}`,
    });
  }
}

/**
 * Send AI inspection alert for critical issues
 */
export async function sendInspectionAlert(
  email: string,
  phone: string | null,
  data: InspectionAlertData
): Promise<void> {
  const severityColor = data.severity === "CRITICAL" ? "#dc2626" : "#f59e0b";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${severityColor}; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .alert { background: #fef2f2; border: 2px solid ${severityColor}; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .issue { background: white; padding: 10px; margin: 8px 0; border-left: 3px solid ${severityColor}; }
        .button { display: inline-block; background: ${severityColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Inspection Alert</h1>
        </div>
        <div class="content">
          <div class="alert">
            <h2 style="margin-top: 0;">${data.severity} Issues Detected</h2>
            <p><strong>Property:</strong> ${data.propertyAddress}</p>
            <p><strong>Component:</strong> ${data.componentType}</p>
            <p><strong>Detections:</strong> ${data.detectionsCount} issues found</p>
          </div>
          ${
            data.criticalIssues && data.criticalIssues.length > 0
              ? `
            <h3>Critical Issues:</h3>
            ${data.criticalIssues.map((issue) => `<div class="issue">${issue}</div>`).join("")}
            <p><strong>Action Required:</strong> These issues require immediate attention to prevent further damage.</p>
          `
              : ""
          }
          <a href="https://app.preloss.com/inspections" class="button">View Full Report</a>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send email
  await sendEmail({
    to: email,
    subject: `${data.severity} Inspection Alert: ${data.componentType} - ${data.propertyAddress}`,
    html: emailHtml,
  });

  // Send SMS for critical issues
  if (phone && data.severity === "CRITICAL") {
    await sendSMS({
      to: phone,
      message: `CRITICAL ALERT: AI inspection detected ${data.detectionsCount} issues with ${data.componentType} at ${data.propertyAddress}. View report: https://app.preloss.com/inspections`,
    });
  }
}

/**
 * Send annual report notification
 */
export async function sendAnnualReportNotification(
  email: string,
  data: {
    propertyAddress: string;
    year: number;
    reportUrl: string;
    overallScore: number;
  }
): Promise<void> {
  const scoreColor =
    data.overallScore >= 80 ? "#10b981" : data.overallScore >= 60 ? "#f59e0b" : "#dc2626";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .score { text-align: center; padding: 30px; background: white; border-radius: 12px; margin: 20px 0; }
        .score-number { font-size: 64px; font-weight: bold; color: ${scoreColor}; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Your ${data.year} Property Report</h1>
        </div>
        <div class="content">
          <h2>Annual Property Health Report</h2>
          <p><strong>Property:</strong> ${data.propertyAddress}</p>
          <div class="score">
            <div class="score-number">${data.overallScore}</div>
            <div>Property Health Score</div>
          </div>
          <p>Your comprehensive ${data.year} property report is now available, including:</p>
          <ul>
            <li>✅ Condition assessments for all systems</li>
            <li>📅 Maintenance summary and recommendations</li>
            <li>🔮 5-year replacement forecast</li>
            <li>💰 Estimated repair costs</li>
            <li>Energy efficiency analysis</li>
            <li>🌦️ Weather vulnerability assessment</li>
          </ul>
          <a href="${data.reportUrl}" class="button">Download Full Report</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Your ${data.year} Property Health Report - ${data.propertyAddress}`,
    html: emailHtml,
  });
}

/**
 * Send maintenance completion notification
 */
export async function sendMaintenanceCompletionNotification(
  email: string,
  data: {
    propertyAddress: string;
    taskName: string;
    completedDate: Date;
    vendorName: string;
    actualCost?: number;
    notes?: string;
  }
): Promise<void> {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .success { background: #f0fdf4; border: 2px solid #10b981; padding: 15px; border-radius: 6px; margin: 15px 0; text-align: center; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Maintenance Completed</h1>
        </div>
        <div class="content">
          <div class="success">
            <h2 style="margin-top: 0;">Task Completed Successfully</h2>
          </div>
          <p><strong>Property:</strong> ${data.propertyAddress}</p>
          <p><strong>Task:</strong> ${data.taskName}</p>
          <p><strong>Completed:</strong> ${data.completedDate.toLocaleDateString()}</p>
          <p><strong>Vendor:</strong> ${data.vendorName}</p>
          ${data.actualCost ? `<p><strong>Cost:</strong> $${(data.actualCost / 100).toFixed(2)}</p>` : ""}
          ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ""}
          <a href="https://app.preloss.com/maintenance" class="button">View History</a>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Maintenance Completed: ${data.taskName}`,
    html: emailHtml,
  });
}

/**
 * Batch send notifications to multiple recipients
 */
export async function sendBulkNotifications(
  notifications: Array<{
    type: "email" | "sms";
    data: EmailNotification | SMSNotification;
  }>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const notification of notifications) {
    try {
      if (notification.type === "email") {
        const success = await sendEmail(notification.data as EmailNotification);
        if (success) sent++;
        else failed++;
      } else {
        const success = await sendSMS(notification.data as SMSNotification);
        if (success) sent++;
        else failed++;
      }
    } catch (error) {
      logger.error("Bulk notification error:", error);
      failed++;
    }
  }

  return { sent, failed };
}
