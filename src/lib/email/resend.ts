/* eslint-disable no-restricted-syntax */
// src/lib/email/resend.ts
import { Resend } from "resend";

let client: Resend | null = null;

export function getResend() {
  if (!client) {
    // eslint-disable-next-line no-restricted-syntax
    const apiKey = process.env.RESEND_API_KEY;

    // During build time, return null if API key is missing
    if (!apiKey) {
      if (
        // eslint-disable-next-line no-restricted-syntax
        process.env.NEXT_PHASE === "phase-production-build" ||
        // eslint-disable-next-line no-restricted-syntax
        process.env.NODE_ENV === "production"
      ) {
        // Return a null placeholder during build
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return null as any;
      }
      throw new Error("RESEND_API_KEY is not set");
    }

    try {
      client = new Resend(apiKey);
    } catch (error) {
      console.warn("[Resend] Failed to initialize:", error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return null as any;
    }
  }
  return client;
}

// Email configuration
// eslint-disable-next-line no-restricted-syntax
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@skaiscrape.com";
// eslint-disable-next-line no-restricted-syntax
export const REPLY_TO_EMAIL = process.env.RESEND_REPLY_TO || "support@skaiscrape.com";

// Email templates
export const TEMPLATES = {
  CLIENT_INVITE: {
    subject: "You've been invited to view your claim",
    getHtml: (params: { clientName: string; magicLink: string; companyName: string }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Client Portal Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                🦅 ${params.companyName}
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                Hi ${params.clientName},
              </h2>
              <p style="margin: 0 0 24px; color: #666; font-size: 16px; line-height: 1.5;">
                You've been invited to view your claim details in the ${params.companyName} client portal.
              </p>
              <p style="margin: 0 0 24px; color: #666; font-size: 16px; line-height: 1.5;">
                Click the button below to access your secure portal:
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${params.magicLink}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Access Client Portal →
                </a>
              </div>
              
              <p style="margin: 24px 0 0; color: #999; font-size: 14px; line-height: 1.5;">
                This link will expire in 1 year. If you have any questions, please contact ${params.companyName} directly.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                © ${new Date().getFullYear()} SkaiScraper. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  },

  PROPOSAL_PUBLISHED: {
    subject: "Your proposal is ready to view",
    getHtml: (params: {
      recipientName: string;
      proposalLink: string;
      message?: string;
      companyName: string;
    }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposal Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                🦅 ${params.companyName}
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                Hi ${params.recipientName},
              </h2>
              <p style="margin: 0 0 24px; color: #666; font-size: 16px; line-height: 1.5;">
                Your proposal has been published and is ready to view.
              </p>
              ${
                params.message
                  ? `
              <div style="margin: 24px 0; padding: 16px; background-color: #f9f9f9; border-left: 3px solid #2563eb; border-radius: 4px;">
                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.5;">
                  ${params.message}
                </p>
              </div>
              `
                  : ""
              }
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${params.proposalLink}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  View Proposal →
                </a>
              </div>
              
              <p style="margin: 24px 0 0; color: #999; font-size: 14px; line-height: 1.5;">
                If you have any questions about this proposal, please contact ${params.companyName} directly.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                © ${new Date().getFullYear()} SkaiScraper. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  },

  TEAM_INVITE: {
    subject: "You've been invited to join a team",
    getHtml: (params: {
      inviteeName: string;
      teamName: string;
      inviteLink: string;
      inviterName: string;
    }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                🦅 SkaiScraper
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                Hi ${params.inviteeName},
              </h2>
              <p style="margin: 0 0 24px; color: #666; font-size: 16px; line-height: 1.5;">
                ${params.inviterName} has invited you to join <strong>${params.teamName}</strong> on SkaiScraper.
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${params.inviteLink}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Accept Invitation →
                </a>
              </div>
              
              <p style="margin: 24px 0 0; color: #999; font-size: 14px; line-height: 1.5;">
                This invitation will expire in 7 days.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; border-top: 1px solid #e5e5e5; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                © ${new Date().getFullYear()} SkaiScraper. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  },
};

/**
 * Generic send email function
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}): Promise<void> {
  const resend = getResend();

  await resend.emails.send({
    from: params.from || FROM_EMAIL,
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo || REPLY_TO_EMAIL,
  });
}

/**
 * Send claim status update email
 */
export async function sendClaimUpdateEmail(
  to: string,
  claimNumber: string,
  newStatus: string,
  details?: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
  <h2>Claim Status Updated</h2>
  <p><strong>Claim:</strong> ${claimNumber}</p>
  <p><strong>New Status:</strong> ${newStatus}</p>
  ${details ? `<p><strong>Details:</strong> ${details}</p>` : ""}
  <p>Login to view full claim details.</p>
</body>
</html>
  `;

  await sendEmail({
    to,
    subject: `Claim ${claimNumber} - Status Updated`,
    html,
  });
}

/**
 * Send report ready email
 */
export async function sendReportReadyEmail(
  to: string,
  claimId: string,
  reportType: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
  <h2>Your Report is Ready</h2>
  <p>Your <strong>${reportType}</strong> has been generated successfully.</p>
  <p>Login to your dashboard to view and download the report.</p>
  // eslint-disable-next-line no-restricted-syntax
  <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/claims/${claimId}/reports" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Report</a></p>
</body>
</html>
  `;

  await sendEmail({
    to,
    subject: `Your ${reportType} is Ready`,
    html,
  });
}

/**
 * Send new message notification email
 */
export async function sendNewMessageEmail(
  to: string,
  senderName: string,
  messagePreview: string,
  threadId: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
  <h2>New Message from ${senderName}</h2>
  <p style="background: #f3f4f6; padding: 16px; border-left: 4px solid #2563eb;">
    ${messagePreview}
  </p>
  // eslint-disable-next-line no-restricted-syntax
  <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/messages/${threadId}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Message</a></p>
</body>
</html>
  `;

  await sendEmail({
    to,
    subject: `New message from ${senderName}`,
    html,
  });
}
