/**
 * Email system using Resend
 * Handles transactional emails: welcome, trial, low-token, receipts
 */

import { Resend } from "resend";

import { logger } from "@/lib/observability/logger";

let _resend: Resend | null = null;

function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// Brand colors
const BRAND = {
  navy: "#0A1A2F",
  blue: "#117CFF",
  yellow: "#FFC838",
  logo: "https://skaiscrape.com/brand/pro_portal_logo.png",
};

interface EmailProps {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email (logs in dev, sends in production)
 */
async function sendEmail({ to, subject, html }: EmailProps) {
  if (process.env.NODE_ENV === "development") {
    logger.debug(`[EMAIL] To: ${to}`);
    logger.debug(`[EMAIL] Subject: ${subject}`);
    logger.debug(`[EMAIL] Body: ${html.substring(0, 200)}...`);
    return { success: true, id: "dev-mode" };
  }

  try {
    const result = await getResend().emails.send({
      from: "SkaiScraper <noreply@skaiscrape.com>",
      to,
      subject,
      html,
    });
    return { success: true, id: result.data?.id };
  } catch (error) {
    logger.error("[EMAIL] Send error:", error);
    return { success: false, error };
  }
}

/**
 * Safe send email - never throws
 */
export async function safeSendEmail({ to, subject, html }: EmailProps) {
  try {
    return await sendEmail({ to, subject, html });
  } catch (error) {
    logger.error("[EMAIL] Safe send failed:", error);
    return { success: false, error };
  }
}

/**
 * Email: Welcome new user
 */
export async function sendWelcomeEmail(to: string, userName: string) {
  const subject = "Welcome to SkaiScraper! 🚀";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <tr>
      <td style="padding: 40px 32px; text-align: center; background: linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.blue} 100%);">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Welcome to SkaiScraper!</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 32px;">
        <p style="margin: 0 0 16px; color: #334155; font-size: 16px; line-height: 1.6;">Hi ${userName},</p>
        <p style="margin: 0 0 16px; color: #334155; font-size: 16px; line-height: 1.6;">
          Welcome to SkaiScraper! We're excited to have you join the future of roofing claims processing.
        </p>
        <p style="margin: 0 0 24px; color: #334155; font-size: 16px; line-height: 1.6;">
          Your account is ready to go. Start by:
        </p>
        <ul style="margin: 0 0 24px; padding-left: 24px; color: #334155; font-size: 16px; line-height: 1.8;">
          <li>Generating your first AI-powered report</li>
          <li>Running a Quick DOL analysis</li>
          <li>Creating weather verification documents</li>
        </ul>
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://skaiscrape.com/dashboard" style="display: inline-block; padding: 14px 32px; background-color: ${BRAND.blue}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Go to Dashboard
          </a>
        </div>
        <p style="margin: 24px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
          Need help? Reply to this email or visit our <a href="https://skaiscrape.com/contact" style="color: ${BRAND.blue};">help center</a>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
          © 2025 SkaiScraper. All rights reserved.<br>
          <a href="https://skaiscrape.com/legal/privacy" style="color: ${BRAND.blue}; text-decoration: none;">Privacy Policy</a> • 
          <a href="https://skaiscrape.com/legal/terms" style="color: ${BRAND.blue}; text-decoration: none;">Terms of Service</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Email: Trial ending soon
 */
export async function sendTrialEndingEmail(to: string, userName: string, daysRemaining: number) {
  const subject = `Your trial ends in ${daysRemaining} days`;
  const html = `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
    <tr>
      <td style="padding: 40px 32px;">
        <h2 style="margin: 0 0 16px; color: ${BRAND.navy}; font-size: 24px;">Hi ${userName},</h2>
        <p style="margin: 0 0 16px; color: #334155; font-size: 16px; line-height: 1.6;">
          Your SkaiScraper trial ends in <strong>${daysRemaining} days</strong>.
        </p>
        <p style="margin: 0 0 24px; color: #334155; font-size: 16px; line-height: 1.6;">
          To continue using all features, choose a plan that fits your business.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://skaiscrape.com/pricing" style="display: inline-block; padding: 14px 32px; background-color: ${BRAND.blue}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
            View Pricing
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 32px; background-color: #f8fafc; text-align: center;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          © 2025 SkaiScraper. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Email: Low token warning
 */
export async function sendLowTokenEmail(to: string, userName: string, remaining: number) {
  const subject = "Low on tokens - Top up now";
  const html = `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
    <tr>
      <td style="padding: 40px 32px;">
        <h2 style="margin: 0 0 16px; color: ${BRAND.navy}; font-size: 24px;">Hi ${userName},</h2>
        <p style="margin: 0 0 16px; color: #334155; font-size: 16px; line-height: 1.6;">
          You're running low on tokens. You have <strong>${remaining} tokens</strong> remaining.
        </p>
        <p style="margin: 0 0 24px; color: #334155; font-size: 16px; line-height: 1.6;">
          Purchase additional tokens to keep your workflow running smoothly.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://skaiscrape.com/pricing/topup" style="display: inline-block; padding: 14px 32px; background-color: ${BRAND.blue}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Top Up Tokens
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 32px; background-color: #f8fafc; text-align: center;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          © 2025 SkaiScraper. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Email: Payment receipt
 */
export async function sendReceiptEmail(
  to: string,
  userName: string,
  amount: number,
  planName: string,
  invoiceUrl?: string
) {
  const subject = "Payment receipt - SkaiScraper";
  const html = `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
    <tr>
      <td style="padding: 40px 32px;">
        <h2 style="margin: 0 0 16px; color: ${BRAND.navy}; font-size: 24px;">Payment Received</h2>
        <p style="margin: 0 0 24px; color: #334155; font-size: 16px; line-height: 1.6;">
          Hi ${userName}, thank you for your payment!
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 0; color: #64748b; font-size: 14px;">Plan</td>
            <td style="padding: 12px 0; color: #334155; font-size: 14px; text-align: right; font-weight: 600;">${planName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #64748b; font-size: 14px;">Amount</td>
            <td style="padding: 12px 0; color: #334155; font-size: 14px; text-align: right; font-weight: 600;">$${amount.toFixed(2)}</td>
          </tr>
        </table>
        ${
          invoiceUrl
            ? `
        <div style="text-align: center; margin: 32px 0;">
          <a href="${invoiceUrl}" style="display: inline-block; padding: 14px 32px; background-color: ${BRAND.blue}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
            View Invoice
          </a>
        </div>
        `
            : ""
        }
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 32px; background-color: #f8fafc; text-align: center;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          © 2025 SkaiScraper. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Email: Trial ending in 24 hours
 */
export async function sendTrialEnding24hEmail(to: string, userName: string, trialEndsAt: Date) {
  const subject = "Your trial ends in 24 hours - SkaiScraper";
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background-color:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="padding:40px 32px;"><h2 style="margin:0 0 16px;color:${BRAND.navy};font-size:24px;">⏰ Your Trial Ends Soon</h2><p style="margin:0 0 24px;color:#334155;font-size:16px;line-height:1.6;">Hi ${userName}, your 72-hour trial ends in <strong>24 hours</strong> (${trialEndsAt.toLocaleString()}).</p><div style="text-align:center;margin:32px 0;"><a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing" style="display:inline-block;padding:14px 32px;background-color:${BRAND.blue};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Choose Your Plan</a></div></td></tr></table></body></html>`;
  return sendEmail({ to, subject, html });
}

/**
 * Email: Trial ending in 1 hour
 */
export async function sendTrialEnding1hEmail(to: string, userName: string, trialEndsAt: Date) {
  const subject = "⚠️ Your trial ends in 1 hour - SkaiScraper";
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background-color:#ffffff;border-radius:16px;overflow:hidden;border:2px solid ${BRAND.yellow};"><tr><td style="padding:40px 32px;"><h2 style="margin:0 0 16px;color:${BRAND.navy};font-size:24px;">🚨 Final Hour!</h2><p style="margin:0 0 24px;color:#334155;font-size:16px;line-height:1.6;">Hi ${userName}, your trial expires in <strong style="color:${BRAND.yellow};">1 hour</strong> (${trialEndsAt.toLocaleString()}).</p><div style="text-align:center;margin:32px 0;"><a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing" style="display:inline-block;padding:16px 40px;background-color:${BRAND.blue};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:18px;">Subscribe Now</a></div></td></tr></table></body></html>`;
  return sendEmail({ to, subject, html });
}

/**
 * Email: Trial has ended
 */
export async function sendTrialEndedEmail(to: string, userName: string) {
  const subject = "Your trial has ended - Subscribe to continue";
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background-color:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="padding:40px 32px;"><h2 style="margin:0 0 16px;color:${BRAND.navy};font-size:24px;">Trial Ended</h2><p style="margin:0 0 24px;color:#334155;font-size:16px;line-height:1.6;">Hi ${userName}, your 72-hour trial of SkaiScraper has ended.</p><p style="margin:0 0 24px;color:#334155;font-size:16px;line-height:1.6;">Your data is safe! Subscribe to a plan to regain access.</p><div style="text-align:center;margin:32px 0;"><a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing" style="display:inline-block;padding:14px 32px;background-color:${BRAND.blue};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">View Plans & Subscribe</a></div></td></tr></table></body></html>`;
  return sendEmail({ to, subject, html });
}

/**
 * Email: Payment failed (dunning)
 */
export async function sendPaymentFailedEmail(to: string, userName: string, amount: number) {
  const subject = "⚠️ Payment failed - Update your payment method";
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background-color:#ffffff;border-radius:16px;overflow:hidden;border:2px solid #ef4444;"><tr><td style="padding:40px 32px;"><h2 style="margin:0 0 16px;color:#dc2626;font-size:24px;">Payment Failed</h2><p style="margin:0 0 24px;color:#334155;font-size:16px;line-height:1.6;">Hi ${userName}, we were unable to process your payment of <strong>$${amount.toFixed(2)}</strong>.</p><div style="text-align:center;margin:32px 0;"><a href="${process.env.NEXT_PUBLIC_APP_URL}/account/billing" style="display:inline-block;padding:14px 32px;background-color:#dc2626;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Update Payment Method</a></div></td></tr></table></body></html>`;
  return sendEmail({ to, subject, html });
}

/**
 * Create email content functions (for preview/webhooks)
 */
export function createWelcomeEmail({ userName }: { userName: string }) {
  return {
    subject: "Welcome to SkaiScraper! 🚀",
    html: `<!DOCTYPE html><html><body><h1>Welcome, ${userName}!</h1><p>Get started with SkaiScraper today.</p></body></html>`,
  };
}

export function createTrialEndingEmail({
  userName,
  daysRemaining,
}: {
  userName: string;
  daysRemaining: number;
}) {
  return {
    subject: `Your trial ends in ${daysRemaining} days`,
    html: `<!DOCTYPE html><html><body><h1>Trial Ending Soon</h1><p>Hi ${userName}, your trial ends in ${daysRemaining} days.</p></body></html>`,
  };
}

export function createPaymentFailedEmail({
  userName,
  amount,
}: {
  userName: string;
  amount: number;
}) {
  return {
    subject: "⚠️ Payment failed - Update your payment method",
    html: `<!DOCTYPE html><html><body><h1>Payment Failed</h1><p>Hi ${userName}, we couldn't process your payment of $${amount.toFixed(2)}.</p></body></html>`,
  };
}

export function createTrialEndedEmail({ userName }: { userName: string }) {
  return {
    subject: "Your trial has ended - Subscribe to continue",
    html: `<!DOCTYPE html><html><body><h1>Trial Ended</h1><p>Hi ${userName}, your trial has ended. Subscribe to continue using SkaiScraper.</p></body></html>`,
  };
}

export function createTrial24HourEmail({
  userName,
  trialEndsAt,
}: {
  userName: string;
  trialEndsAt: Date;
}) {
  return {
    subject: "Your trial ends in 24 hours",
    html: `<!DOCTYPE html><html><body><h1>Trial Ending Soon</h1><p>Hi ${userName}, your trial ends at ${trialEndsAt.toLocaleString()}.</p></body></html>`,
  };
}

export function createTrial1HourEmail({
  userName,
  trialEndsAt,
}: {
  userName: string;
  trialEndsAt: Date;
}) {
  return {
    subject: "⚠️ Your trial ends in 1 hour",
    html: `<!DOCTYPE html><html><body><h1>Final Hour!</h1><p>Hi ${userName}, your trial ends at ${trialEndsAt.toLocaleString()}.</p></body></html>`,
  };
}
