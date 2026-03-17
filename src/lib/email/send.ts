/**
 * React Email → Resend Wiring
 *
 * This module bridges the React Email templates in /emails/ with the Resend
 * send function. Each export renders a React Email component to HTML and sends
 * via Resend. Import these instead of the raw HTML email functions in resend.ts
 * for rich, branded, responsive emails.
 *
 * Usage:
 *   import { sendClaimAssignedEmail } from "@/lib/email/send";
 *   await sendClaimAssignedEmail({ to: "user@example.com", ... });
 */

import "server-only";

import { render } from "@react-email/render";
import { createElement } from "react";

import ClaimStatusUpdateEmail from "@/emails/claim-status-update";
import ClaimAssigned from "@/emails/ClaimAssigned";
import NewMessageEmail from "@/emails/new-message";
import ReportReadyEmail from "@/emails/report-ready";
import TeamInviteEmail from "@/emails/team-invite";
import WeeklySummary from "@/emails/weekly-summary";
import { logger } from "@/lib/logger";

import { FROM_EMAIL, getResend, REPLY_TO_EMAIL } from "./resend";

// ── Helper ──────────────────────────────────────────────────────────────────

async function sendReactEmail(params: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  from?: string;
  replyTo?: string;
}) {
  const resend = getResend();
  if (!resend) {
    logger.warn("[EMAIL] Resend client not available — skipping send");
    return;
  }

  const html = await render(params.react);

  await resend.emails.send({
    from: params.from || FROM_EMAIL,
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
    html,
    replyTo: params.replyTo || REPLY_TO_EMAIL,
  });

  logger.info("[EMAIL] Sent", { to: params.to, subject: params.subject });
}

// ── Claim Assigned ──────────────────────────────────────────────────────────

export async function sendClaimAssignedEmail(params: {
  to: string;
  assigneeName: string;
  claimNumber: string;
  propertyAddress: string;
  carrier: string;
  assignedBy: string;
  claimUrl?: string;
}) {
  await sendReactEmail({
    to: params.to,
    subject: `New claim assigned: ${params.claimNumber}`,
    react: createElement(ClaimAssigned, {
      assigneeName: params.assigneeName,
      claimNumber: params.claimNumber,
      propertyAddress: params.propertyAddress,
      carrier: params.carrier,
      assignedBy: params.assignedBy,
      claimUrl: params.claimUrl,
    }),
  });
}

// ── Claim Status Update ─────────────────────────────────────────────────────

export async function sendClaimStatusUpdateReactEmail(params: {
  to: string;
  recipientName?: string;
  claimNumber: string;
  propertyAddress: string;
  oldStatus: string;
  newStatus: string;
  statusDescription: string;
  claimUrl: string;
  company?: string;
}) {
  await sendReactEmail({
    to: params.to,
    subject: `Claim ${params.claimNumber} — Status Updated to ${params.newStatus}`,
    react: createElement(ClaimStatusUpdateEmail, {
      recipientName: params.recipientName,
      claimNumber: params.claimNumber,
      propertyAddress: params.propertyAddress,
      oldStatus: params.oldStatus,
      newStatus: params.newStatus,
      statusDescription: params.statusDescription,
      claimUrl: params.claimUrl,
      company: params.company,
    }),
  });
}

// ── New Message ─────────────────────────────────────────────────────────────

export async function sendNewMessageReactEmail(params: {
  to: string;
  recipientName?: string;
  senderName: string;
  messagePreview: string;
  messageUrl: string;
  company?: string;
}) {
  await sendReactEmail({
    to: params.to,
    subject: `New message from ${params.senderName}`,
    react: createElement(NewMessageEmail, {
      recipientName: params.recipientName,
      senderName: params.senderName,
      messagePreview: params.messagePreview,
      messageUrl: params.messageUrl,
      company: params.company,
    }),
  });
}

// ── Report Ready ────────────────────────────────────────────────────────────

export async function sendReportReadyReactEmail(params: {
  to: string;
  shareUrl: string;
  pdfUrl: string;
  company?: string;
  recipientName?: string;
}) {
  await sendReactEmail({
    to: params.to,
    subject: "Your report is ready to review",
    react: createElement(ReportReadyEmail, {
      shareUrl: params.shareUrl,
      pdfUrl: params.pdfUrl,
      company: params.company,
      recipientName: params.recipientName,
    }),
  });
}

// ── Team Invite ─────────────────────────────────────────────────────────────

export async function sendTeamInviteReactEmail(params: {
  to: string;
  recipientName?: string;
  inviterName: string;
  companyName: string;
  role: string;
  acceptUrl: string;
  expiresInDays?: number;
}) {
  await sendReactEmail({
    to: params.to,
    subject: `${params.inviterName} invited you to join ${params.companyName}`,
    react: createElement(TeamInviteEmail, {
      recipientName: params.recipientName,
      inviterName: params.inviterName,
      companyName: params.companyName,
      role: params.role,
      acceptUrl: params.acceptUrl,
      expiresInDays: params.expiresInDays,
    }),
  });
}

// ── Weekly Summary ──────────────────────────────────────────────────────────

export async function sendWeeklySummaryEmail(params: {
  to: string | string[];
  orgName: string;
  weekOf: string;
  stats: {
    newClaims: number;
    closedClaims: number;
    activeUsers: number;
    totalActivities: number;
    closeRate: number;
    avgCycleTimeDays: number;
  };
  topFeatures?: { name: string; count: number }[];
  dashboardUrl?: string;
}) {
  await sendReactEmail({
    to: params.to,
    subject: `Weekly Summary — ${params.orgName} — ${params.weekOf}`,
    react: createElement(WeeklySummary, {
      orgName: params.orgName,
      weekOf: params.weekOf,
      stats: params.stats,
      topFeatures: params.topFeatures,
      dashboardUrl: params.dashboardUrl,
    }),
  });
}
