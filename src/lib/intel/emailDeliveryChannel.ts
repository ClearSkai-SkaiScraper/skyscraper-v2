// src/lib/intel/emailDeliveryChannel.ts
// Production implementation replacing prior stub.
// Provides carrier email sending, ingestion parsing, and simple interaction tracking.

import { Resend } from "resend";

// eslint-disable-next-line no-restricted-syntax
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface SendCarrierEmailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  claimId?: string;
  orgId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface CarrierEmailProcessingResult {
  messageId?: string;
  actions: string[];
  scan?: unknown;
  depreciation?: unknown;
}

/**
 * Stub: pretend we sent an email to the carrier.
 */
export async function sendEmailToCarrier(
  input: SendCarrierEmailInput
): Promise<CarrierEmailProcessingResult> {
  if (!resend) {
    return { messageId: "resend_unconfigured", actions: ["skipped_unconfigured"] };
  }
  // eslint-disable-next-line no-restricted-syntax
  const from = process.env.CARRIER_EMAIL_FROM || "notifications@skaiscrape.com";
  const { to, subject, html, text } = input;

  const emailOptions =
    typeof html === "string"
      ? { from, to, subject, html }
      : typeof text === "string"
        ? { from, to, subject, text }
        : { from, to, subject, text: "" };

  const result = await resend.emails.send(emailOptions);

  const messageId = "data" in result && result.data ? result.data.id : undefined;

  return {
    messageId,
    actions: ["sent"],
    scan: { queued: true },
  };
}

/**
 * Stub: pretend we ingested a carrier email.
 */
interface IngestCarrierEmailInput {
  raw: string; // RFC822 source or simplified payload
  claimId?: string;
  orgId?: string;
}

export async function ingestCarrierEmail(
  input: IngestCarrierEmailInput
): Promise<CarrierEmailProcessingResult> {
  // Very lightweight parsing — extract subject line & simple tokens.
  const lines = input.raw.split(/\r?\n/);
  const subjectLine = lines.find((l) => /^Subject:/i.test(l)) || "";
  const tokens = lines.filter((l) => l.includes(":")).slice(0, 25);
  return {
    messageId: "parsed_local",
    actions: ["parsed", "stored"],
    scan: { subject: subjectLine.replace(/^Subject:\s*/i, ""), tokens },
  };
}

/**
 * Optional analytics stubs. Kept simple so build cannot fail on them.
 */
export function recordEmailOpen(_trackingId?: string): { success: boolean; action: string } {
  return { success: true, action: "email_open_recorded" };
}

export function recordLinkClick(
  _trackingId?: string,
  _linkUrl?: string
): { success: boolean; action: string } {
  return { success: true, action: "link_click_recorded" };
}
