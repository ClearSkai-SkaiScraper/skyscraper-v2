import { Resend } from "resend";
import twilio from "twilio";

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const twilioClient =
  process.env.TWILIO_SID && process.env.TWILIO_AUTH
    ? twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH)
    : null;

interface NotifyParams {
  clientId: string;
  subject: string;
  message: string;
  sendSMS?: boolean;
  sendEmail?: boolean;
}

export async function notifyClient({
  clientId,
  subject,
  message,
  sendSMS = true,
  sendEmail = true,
}: NotifyParams) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, reason: "client_not_found" };

  if (sendEmail && client.email && resend) {
    try {
      await resend.emails.send({
        from: "SkaiScraper <no-reply@skai>",
        to: client.email,
        subject,
        html: `<p>${message}</p>`,
      });
    } catch (e) {
      logger.error("Email send error", e);
    }
  }

  if (sendSMS && client.phone && twilioClient && process.env.TWILIO_NUMBER) {
    try {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_NUMBER,
        to: client.phone,
      });
    } catch (e) {
      logger.error("SMS send error", e);
    }
  }

  // NOTE: Previously persisted a DB message via a non-existent Prisma model.
  // Keeping this as a no-op until we align to an actual table/model.

  return { ok: true };
}

export async function notifyApproval(
  type: "client_submitted" | "manager_signed",
  reportId: string,
  versionNo?: number
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const supabaseUrl =
    (process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined) ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const fnUrl = `${supabaseUrl!.replace("/rest/v1", "")}/functions/v1/approval-notify`;

  const res = await fetch(fnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type, reportId, versionNo }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to send notification");
  }

  return res.json();
}
