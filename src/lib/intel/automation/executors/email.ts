// lib/intel/automation/executors/email.ts
/**
 * 🔥 EMAIL COMMUNICATION EXECUTOR
 * Auto-sends emails to adjusters/homeowners
 */

import { randomUUID } from "node:crypto";

import { Resend } from "resend";

import { logger } from "@/lib/observability/logger";
import prisma from "@/lib/prisma";

let _resend: Resend | null = null;

function getResend() {
  if (!_resend && process.env.RESEND_API_KEY) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function executeSendEmail(
  claimId: string,
  orgId: string,
  audience: "ADJUSTER" | "HOMEOWNER",
  config?: any
) {
  logger.debug(`[SKAI] Sending email to ${audience} for ${claimId}`);

  // Fetch claim
  const claim = await prisma.claims.findUnique({
    where: { id: claimId, orgId },
    include: { properties: true },
  });

  if (!claim) throw new Error("Claim not found");

  const recipientEmail = audience === "ADJUSTER" ? claim.adjusterEmail : claim.homeowner_email;

  if (!recipientEmail) {
    logger.debug(`[SKAI] No ${audience} email found - skipping`);
    return { skipped: true, reason: `No ${audience} email` };
  }

  // Build email content
  const subject =
    audience === "ADJUSTER"
      ? `Claim Update: ${claim.claimNumber}`
      : `Your Claim Documentation: ${claim.claimNumber}`;

  const text =
    audience === "ADJUSTER"
      ? `Dear ${claim.adjusterName || "Adjuster"},\n\nPlease find the updated claim documentation attached.\n\nBest regards,\nSkaiScraper Intelligence Team`
      : `Dear ${claim.insured_name || "Homeowner"},\n\nYour claim documentation has been updated.\n\nBest regards,\nYour Claims Team`;

  // Send email
  try {
    const resendClient = getResend();
    if (!resendClient) {
      logger.warn(`[SKAI] Resend not configured, skipping email to ${recipientEmail}`);
      return;
    }

    const result = await resendClient.emails.send({
      from: "SkaiScraper <noreply@skaiscrape.com>",
      to: recipientEmail,
      subject,
      text,
    });

    // Log activity
    await prisma.activities.create({
      data: {
        id: randomUUID(),
        orgId,
        claimId,
        userId: "skai",
        userName: "SkaiPDF",
        type: "email_sent",
        title: "Email Sent",
        description: `SkaiPDF sent email to ${audience.toLowerCase()}: ${recipientEmail}`,
        metadata: {
          audience,
          emailId: result.data?.id,
        },
        updatedAt: new Date(),
      },
    });

    logger.debug(`[SKAI] Email sent successfully to ${recipientEmail}`);

    return {
      success: true,
      emailId: result.data?.id,
      recipient: recipientEmail,
    };
  } catch (error) {
    logger.error(`[SKAI] Email send failed:`, error);
    return {
      success: false,
      error: String(error),
    };
  }
}
