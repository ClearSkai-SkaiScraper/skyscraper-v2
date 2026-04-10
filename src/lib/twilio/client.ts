/**
 * Twilio Client — Canonical Singleton
 * ─────────────────────────────────────────────────────────
 * Single source of truth for all outbound SMS.
 *
 * ACTIVATION STEPS (for owner):
 * 1. Create a Twilio account at https://www.twilio.com
 * 2. Get your Account SID, Auth Token, and a phone number
 * 3. Set these env vars in Vercel:
 *    - TWILIO_ACCOUNT_SID  (or TWILIO_SID)
 *    - TWILIO_AUTH_TOKEN   (or TWILIO_AUTH)
 *    - TWILIO_PHONE_NUMBER (or TWILIO_NUMBER)
 * 4. Set your webhook URL in Twilio Dashboard:
 *    https://www.skaiscrape.com/api/webhooks/twilio
 * 5. Done — SMS features activate automatically.
 */

import { logger } from "@/lib/logger";

// ─── Environment ──────────────────────────────────────────
function getConfig() {
  return {
    // eslint-disable-next-line no-restricted-syntax
    accountSid: process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID || "",
    // eslint-disable-next-line no-restricted-syntax
    authToken: process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH || "",
    // eslint-disable-next-line no-restricted-syntax
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_NUMBER || "",
  };
}

/**
 * Check if Twilio is configured and ready to send.
 * Returns false if any required env var is missing.
 */
export function isTwilioConfigured(): boolean {
  const { accountSid, authToken, phoneNumber } = getConfig();
  return !!(accountSid && authToken && phoneNumber);
}

/**
 * Get a human-readable status for health checks.
 */
export function getTwilioStatus(): {
  configured: boolean;
  message: string;
} {
  if (!isTwilioConfigured()) {
    return {
      configured: false,
      message:
        "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.",
    };
  }
  return { configured: true, message: "Twilio configured and ready" };
}

// ─── SMS Send ─────────────────────────────────────────────

export interface SendSmsResult {
  success: boolean;
  sid?: string;
  status: "sent" | "queued" | "failed" | "not_configured";
  error?: string;
}

/**
 * Send an SMS via Twilio REST API.
 * Returns { success: false, status: "not_configured" } if keys are missing —
 * this allows the caller to gracefully degrade instead of crashing.
 */
export async function sendSms(
  to: string,
  body: string,
  opts?: { from?: string; statusCallback?: string }
): Promise<SendSmsResult> {
  const config = getConfig();

  if (!config.accountSid || !config.authToken || !config.phoneNumber) {
    logger.warn("[Twilio] SMS not sent — credentials not configured");
    return { success: false, status: "not_configured" };
  }

  const from = opts?.from || config.phoneNumber;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
    const params = new URLSearchParams({ To: to, From: from, Body: body });

    if (opts?.statusCallback) {
      params.set("StatusCallback", opts.statusCallback);
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await res.json();

    if (!res.ok) {
      logger.error("[Twilio] SMS send failed", {
        status: res.status,
        code: data.code,
        message: data.message,
      });
      return { success: false, status: "failed", error: data.message };
    }

    logger.debug("[Twilio] SMS sent", { sid: data.sid, to });
    return { success: true, sid: data.sid, status: data.status || "queued" };
  } catch (error) {
    logger.error("[Twilio] SMS send error:", error);
    return { success: false, status: "failed", error: "Network error" };
  }
}

/**
 * Validate a Twilio webhook signature (HMAC-SHA1).
 * Use this in /api/webhooks/twilio to verify inbound messages.
 */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const config = getConfig();
  if (!config.authToken) return false;

  try {
    const crypto = require("crypto");

    // Build the data string: URL + sorted params concatenated
    let data = url;
    const sortedKeys = Object.keys(params).sort();
    for (const key of sortedKeys) {
      data += key + params[key];
    }

    const expected = crypto.createHmac("sha1", config.authToken).update(data).digest("base64");

    return expected === signature;
  } catch {
    return false;
  }
}
