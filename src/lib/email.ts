import { logger } from "@/lib/logger";

/**
 * Email utility for CRM notifications
 * This is a placeholder implementation - integrate with your email provider
 */

export interface EmailData {
  to: string | string[];
  subject: string;
  template?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
  html?: string;
  text?: string;
}

export async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    // TODO: Integrate with your email provider (SendGrid, AWS SES, etc.)
    logger.debug("📧 [EMAIL] Would be sent", {
      to: emailData.to,
      subject: emailData.subject,
      template: emailData.template,
      data: emailData.data,
    });

    // For development, just log the email
    // eslint-disable-next-line no-restricted-syntax
    if (process.env.NODE_ENV === "development") {
      logger.debug("🔧 Development mode: Email logged but not sent");
      return true;
    }

    // Production implementation would go here
    // Example with SendGrid:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: emailData.to,
      from: process.env.FROM_EMAIL,
      subject: emailData.subject,
      html: emailData.html || generateHtmlFromTemplate(emailData.template, emailData.data),
      text: emailData.text,
    };
    
    await sgMail.send(msg);
    */

    return true;
  } catch (error) {
    logger.error("Failed to send email:", error);
    return false;
  }
}

export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    // TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
    logger.debug("📱 SMS would be sent:", { to, message });

    // eslint-disable-next-line no-restricted-syntax
    if (process.env.NODE_ENV === "development") {
      logger.debug("🔧 Development mode: SMS logged but not sent");
      return true;
    }

    // Production implementation would go here
    return true;
  } catch (error) {
    logger.error("Failed to send SMS:", error);
    return false;
  }
}

/**
 * Generate email templates for different CRM events
 */
export function generateEmailTemplate(
  template: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
): { html: string; text: string } {
  const templates = {
    inspection_scheduled: {
      html: `
        <h2>Inspection Scheduled</h2>
        <p>Hello ${data.contactName},</p>
        <p>Your property inspection has been scheduled for:</p>
        <p><strong>Property:</strong> ${data.propertyAddress}</p>
        <p><strong>Project:</strong> ${data.projectTitle}</p>
        <p>We'll be in touch with specific timing details.</p>
        <p>Thank you,<br>Your Roofing Team</p>
      `,
      text: `
        Inspection Scheduled
        
        Hello ${data.contactName},
        
        Your property inspection has been scheduled for:
        Property: ${data.propertyAddress}
        Project: ${data.projectTitle}
        
        We'll be in touch with specific timing details.
        
        Thank you,
        Your Roofing Team
      `,
    },

    estimate_sent: {
      html: `
        <h2>Your Property Estimate</h2>
        <p>Hello ${data.contactName},</p>
        <p>We've completed your property estimate for:</p>
        <p><strong>Property:</strong> ${data.propertyAddress}</p>
        <p><strong>Project:</strong> ${data.projectTitle}</p>
        <p>Please review the estimate and let us know if you have any questions.</p>
        <p>Thank you,<br>Your Roofing Team</p>
      `,
      text: `
        Your Property Estimate
        
        Hello ${data.contactName},
        
        We've completed your property estimate for:
        Property: ${data.propertyAddress}
        Project: ${data.projectTitle}
        
        Please review the estimate and let us know if you have any questions.
        
        Thank you,
        Your Roofing Team
      `,
    },

    project_completed: {
      html: `
        <h2>Project Completed</h2>
        <p>Hello ${data.contactName},</p>
        <p>We're pleased to inform you that your project has been completed:</p>
        <p><strong>Property:</strong> ${data.propertyAddress}</p>
        <p><strong>Project:</strong> ${data.projectTitle}</p>
        <p>Thank you for choosing us for your roofing needs. Your project comes with our warranty protection.</p>
        <p>Thank you,<br>Your Roofing Team</p>
      `,
      text: `
        Project Completed
        
        Hello ${data.contactName},
        
        We're pleased to inform you that your project has been completed:
        Property: ${data.propertyAddress}
        Project: ${data.projectTitle}
        
        Thank you for choosing us for your roofing needs. Your project comes with our warranty protection.
        
        Thank you,
        Your Roofing Team
      `,
    },

    task_reminder: {
      html: `
        <h2>Task Reminder</h2>
        <p>Hello ${data.assigneeName},</p>
        <p>This is a reminder that you have a task due:</p>
        <p><strong>Task:</strong> ${data.taskTitle}</p>
        <p><strong>Description:</strong> ${data.taskDescription}</p>
        <p><strong>Due Date:</strong> ${data.dueDate}</p>
        <p><strong>Project:</strong> ${data.projectTitle}</p>
        <p>Please complete this task as soon as possible.</p>
        <p>Thank you,<br>CRM System</p>
      `,
      text: `
        Task Reminder
        
        Hello ${data.assigneeName},
        
        This is a reminder that you have a task due:
        Task: ${data.taskTitle}
        Description: ${data.taskDescription}
        Due Date: ${data.dueDate}
        Project: ${data.projectTitle}
        
        Please complete this task as soon as possible.
        
        Thank you,
        CRM System
      `,
    },
  };

  return (
    templates[template as keyof typeof templates] || {
      html: `<p>Template not found: ${template}</p>`,
      text: `Template not found: ${template}`,
    }
  );
}
