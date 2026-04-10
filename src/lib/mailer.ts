// =====================================================
// EMAIL MAILER UTILITY
// =====================================================
// Wrapper for Resend with React Email templates
// =====================================================

import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";

import AcceptanceReceiptEmail from "@/email-templates/acceptance-receipt";
import ReportReadyEmail from "@/email-templates/report-ready";
import TeamInviteEmail from "@/email-templates/team-invite";
import { logger } from "@/lib/observability/logger";

let _resend: Resend | null = null;

function getResend() {
  // eslint-disable-next-line no-restricted-syntax
  if (!_resend && process.env.RESEND_API_KEY) {
    // eslint-disable-next-line no-restricted-syntax
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// eslint-disable-next-line no-restricted-syntax
const FROM = process.env.EMAIL_FROM || "ClearSkai <no-reply@skaiscrape.com>";

/**
 * Send "Report Ready" email to client with share link + PDF
 */
export async function sendReportReadyEmail(opts: {
  to: string;
  shareUrl: string;
  pdfUrl: string;
  recipientName?: string;
  company?: string;
}) {
  const { to, shareUrl, pdfUrl, recipientName, company } = opts;

  return await getResend()?.emails?.send({
    from: FROM,
    to,
    subject: "Your damage assessment report is ready",
    react: ReportReadyEmail({
      shareUrl,
      pdfUrl,
      recipientName,
      company,
    }),
  });
}

/**
 * Send acceptance receipt to client + internal team (NEW)
 */
export async function sendAcceptanceReceiptEmail(opts: {
  to: string[];
  orgName: string;
  reportId: string;
  shareUrl: string;
  receiptPdfUrl: string;
  reportPdfUrl?: string;
  clientName?: string;
  acceptedAt: Date;
}) {
  const { to, orgName, reportId, shareUrl, receiptPdfUrl, reportPdfUrl, clientName, acceptedAt } =
    opts;

  try {
    return await getResend()?.emails?.send({
      from: FROM,
      to,
      subject: `Acceptance Receipt – Report ${reportId}`,
      react: AcceptanceReceiptEmail({
        orgName,
        reportId,
        shareUrl,
        receiptPdfUrl,
        reportPdfUrl,
        clientName,
        acceptedAt,
      }),
    });
  } catch (error) {
    logger.error("Email sending error:", error);
    Sentry.captureException(error, {
      tags: { component: "email-sending", email_type: "acceptance_receipt" },
      extra: { reportId, to, orgName },
    });
    throw error;
  }
}

/**
 * Send team invite email when a contractor invites a team member
 */
export async function sendTeamInviteEmail(opts: {
  to: string;
  inviterName: string;
  companyName: string;
  inviteeName?: string;
  role: string;
  inviteToken: string;
}) {
  const { to, inviterName, companyName, inviteeName, role, inviteToken } = opts;
  // eslint-disable-next-line no-restricted-syntax
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://skaiscrape.com";
  const inviteUrl = `${baseUrl}/trades/join?token=${inviteToken}`;

  try {
    return await getResend()?.emails?.send({
      from: FROM,
      to,
      subject: `${inviterName} invited you to join ${companyName} on ClearSkai`,
      react: TeamInviteEmail({
        inviterName,
        companyName,
        inviteeName,
        role,
        inviteUrl,
      }),
    });
  } catch (error) {
    logger.error("[mailer] Team invite email error:", error);
    Sentry.captureException(error, {
      tags: { component: "email-sending", email_type: "team_invite" },
      extra: { to, companyName, inviterName },
    });
    throw error;
  }
}

/**
 * Send notification email for new messages, claim updates, etc.
 */
export async function sendNotificationEmail(opts: {
  to: string;
  subject: string;
  recipientName?: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
}) {
  const { to, subject, recipientName, title, body, actionUrl, actionLabel } = opts;
  // eslint-disable-next-line no-restricted-syntax
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://skaiscrape.com";

  try {
    return await getResend()?.emails?.send({
      from: FROM,
      to,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 40px;">
          <img src="${baseUrl}/logo-dark.png" width="140" alt="ClearSkai" style="display: block; margin: 0 auto 24px;" />
          <h2 style="font-size: 20px; color: #0f172a; text-align: center;">${title}</h2>
          ${recipientName ? `<p style="color: #334155; font-size: 15px;">Hi ${recipientName},</p>` : ""}
          <p style="color: #334155; font-size: 15px; line-height: 1.5;">${body}</p>
          ${actionUrl ? `<div style="text-align: center; margin: 24px 0;"><a href="${baseUrl}${actionUrl}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">${actionLabel || "View Details"}</a></div>` : ""}
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">ClearSkai Technologies LLC</p>
        </div>
      `,
    });
  } catch (error) {
    logger.error("[mailer] Notification email error:", error);
    Sentry.captureException(error, {
      tags: { component: "email-sending", email_type: "notification" },
      extra: { to, subject },
    });
    // Don't throw — notifications are best-effort
    return null;
  }
}
