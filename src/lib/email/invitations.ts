import { logger } from "@/lib/observability/logger";

import { FROM_EMAIL, getResend } from "@/lib/email/resend";
import { APP_URL } from "@/lib/env";

const APP_NAME = "SkaiScraper";

interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  orgName: string;
  role: string;
  token: string;
  message?: string;
}

interface InvitationEmailContentParams {
  inviterName: string;
  orgName: string;
  role: string;
  inviteUrl: string;
  message?: string;
}

export async function sendInvitationEmail({
  to,
  inviterName,
  orgName,
  role,
  token,
  message,
}: SendInvitationEmailParams) {
  const inviteUrl = `${APP_URL}/invite/${token}`;

  const html = generateInvitationEmailHTML({
    inviterName,
    orgName,
    role,
    inviteUrl,
    message,
  });

  const text = generateInvitationEmailText({
    inviterName,
    orgName,
    role,
    inviteUrl,
    message,
  });

  try {
    logger.info(`[INVITATION_EMAIL] Sending to ${to} from ${FROM_EMAIL}`);

    const resend = getResend();
    if (!resend) {
      throw new Error("Resend client not initialized - check RESEND_API_KEY");
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${inviterName} invited you to join ${orgName} on ${APP_NAME}`,
      html,
      text,
    });

    if (error) {
      logger.error(`[INVITATION_EMAIL] Resend API error to=${to} from=${FROM_EMAIL}: ${error.message}`);
      throw new Error(error.message);
    }

    logger.info(`[INVITATION_EMAIL] ✅ Sent successfully to ${to}, messageId:`, data?.id);
    return data;
  } catch (error) {
    logger.error("[INVITATION_EMAIL] Failed:", error);
    throw error;
  }
}

function generateInvitationEmailHTML({
  inviterName,
  orgName,
  role,
  inviteUrl,
  message,
}: InvitationEmailContentParams) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">You're Invited!</h1>
  </div>
  
  <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on ${APP_NAME}.
    </p>
    
    ${
      message
        ? `
      <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-style: italic; color: #555;">"${message}"</p>
      </div>
    `
        : ""
    }
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your Role:</p>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #667eea; text-transform: capitalize;">
        ${role}
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        Accept Invitation
      </a>
    </div>
    
    <div style="border-top: 2px solid #e9ecef; margin-top: 30px; padding-top: 20px;">
      <p style="font-size: 13px; color: #666; margin-bottom: 10px;">
        <strong>What happens next?</strong>
      </p>
      <ol style="font-size: 13px; color: #666; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Click the button above to accept the invitation</li>
        <li style="margin-bottom: 8px;">Sign in or create a free account</li>
        <li style="margin-bottom: 8px;">You'll automatically join ${orgName}</li>
        <li style="margin-bottom: 8px;">Start collaborating with your team!</li>
      </ol>
      
      <p style="font-size: 12px; color: #999; margin-top: 20px;">
        This invitation will expire in 7 days. If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
    <p>
      © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.<br>
      <a href="${APP_URL}" style="color: #667eea; text-decoration: none;">Visit our website</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

function generateInvitationEmailText({
  inviterName,
  orgName,
  role,
  inviteUrl,
  message,
}: InvitationEmailContentParams) {
  return `
You're Invited to Join ${orgName}!

${inviterName} has invited you to join ${orgName} on ${APP_NAME}.

${message ? `Personal Message:\n"${message}"\n` : ""}

Your Role: ${role}

Accept your invitation by visiting:
${inviteUrl}

What happens next?
1. Click the link above to accept the invitation
2. Sign in or create a free account
3. You'll automatically join ${orgName}
4. Start collaborating with your team!

This invitation will expire in 7 days.

---
© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
Visit our website: ${APP_URL}
  `.trim();
}

interface SendWelcomeEmailParams {
  to: string;
  name: string;
  orgName: string;
  role: string;
}

export async function sendWelcomeEmail({ to, name, orgName, role }: SendWelcomeEmailParams) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the Team</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Welcome to ${orgName}!</h1>
  </div>
  
  <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hi ${name},
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Welcome to the team! You've successfully joined <strong>${orgName}</strong> as a <strong>${role}</strong>.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        Go to Dashboard
      </a>
    </div>
    
    <div style="border-top: 2px solid #e9ecef; margin-top: 30px; padding-top: 20px;">
      <p style="font-size: 13px; color: #666; margin-bottom: 10px;">
        <strong>Quick Start Guide:</strong>
      </p>
      <ul style="font-size: 13px; color: #666; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Explore the dashboard to see your organization's overview</li>
        <li style="margin-bottom: 8px;">Check out the Claims section to start managing insurance claims</li>
        <li style="margin-bottom: 8px;">Visit the Teams page to see your colleagues</li>
        <li style="margin-bottom: 8px;">Need help? Check out our documentation or contact support</li>
      </ul>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
    <p>
      © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.<br>
      <a href="${APP_URL}" style="color: #10b981; text-decoration: none;">Visit our website</a>
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Welcome to ${orgName}!

Hi ${name},

Welcome to the team! You've successfully joined ${orgName} as a ${role}.

Visit your dashboard: ${APP_URL}/dashboard

Quick Start Guide:
- Explore the dashboard to see your organization's overview
- Check out the Claims section to start managing insurance claims
- Visit the Teams page to see your colleagues
- Need help? Check out our documentation or contact support

---
© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
Visit our website: ${APP_URL}
  `.trim();

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Welcome to ${orgName} - Let's Get Started!`,
      html,
      text,
    });

    if (error) {
      logger.error("Failed to send welcome email:", error);
      throw new Error(error.message);
    }

    logger.debug(`✅ Welcome email sent to ${to}:`, data);
    return data;
  } catch (error) {
    logger.error("Email sending failed:", error);
    throw error;
  }
}
