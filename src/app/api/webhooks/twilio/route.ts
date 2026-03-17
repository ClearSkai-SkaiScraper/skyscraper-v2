export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Twilio signature validation (HMAC-SHA1)
// https://www.twilio.com/docs/usage/security#validating-requests
// ---------------------------------------------------------------------------
function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  // Sort params alphabetically by key and concatenate key+value
  const data =
    url +
    Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], "");

  const expectedSignature = crypto.createHmac("sha1", authToken).update(data).digest("base64");

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/twilio — Twilio inbound SMS webhook
// Twilio sends form-urlencoded POST with From, To, Body, MessageSid, etc.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Validate Twilio request signature (HMAC-SHA1)
    const twilioSignature = req.headers.get("x-twilio-signature");
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    if (!twilioSignature || !twilioAuthToken) {
      logger.warn("[twilio-webhook] Missing Twilio signature or auth token");
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 403,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const contentType = req.headers.get("content-type") || "";
    let from = "";
    let to = "";
    let body = "";
    let messageSid = "";
    let formParams: Record<string, string> = {};

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      // Collect all form params for signature validation
      formData.forEach((value, key) => {
        formParams[key] = value.toString();
      });
      from = formParams["From"] || "";
      to = formParams["To"] || "";
      body = formParams["Body"] || "";
      messageSid = formParams["MessageSid"] || "";
    } else {
      const json = await req.json().catch(() => ({}));
      from = json.From || json.from || "";
      to = json.To || json.to || "";
      body = json.Body || json.body || "";
      messageSid = json.MessageSid || json.messageSid || "";
      formParams = json;
    }

    // Validate HMAC signature using Twilio's algorithm
    const webhookUrl = process.env.TWILIO_WEBHOOK_URL || req.url;
    if (!validateTwilioSignature(twilioAuthToken, twilioSignature, webhookUrl, formParams)) {
      logger.warn("[twilio-webhook] Invalid Twilio signature — rejecting request");
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 403,
        headers: { "Content-Type": "text/xml" },
      });
    }

    if (!from || !body) {
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    logger.debug(`[twilio-inbound] From=${from} Body=${body.substring(0, 100)}`);

    // Normalize phone: strip everything except digits, ensure +1 prefix
    const normalizedPhone = from.replace(/\D/g, "").replace(/^1/, "");
    const phoneVariants = [from, `+1${normalizedPhone}`, `1${normalizedPhone}`, normalizedPhone];

    // Find matching contact across all orgs
    const contact = await prisma.contacts.findFirst({
      where: {
        phone: { in: phoneVariants },
      },
      orderBy: { createdAt: "desc" },
    });

    // Store message in sms_messages table
    await prisma.sms_messages.create({
      data: {
        id: crypto.randomUUID(),
        orgId: contact?.orgId || "unmatched",
        contactId: contact?.id || null,
        direction: "inbound",
        from: from,
        to: to,
        body: body,
        externalId: messageSid || null,
        status: "received",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Return TwiML empty response (no auto-reply for now)
    const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    logger.error("[twilio-webhook]", err);
    // Always return 200 to Twilio to prevent retries
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
