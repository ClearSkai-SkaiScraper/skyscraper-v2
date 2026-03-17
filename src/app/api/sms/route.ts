export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { safeOrgContext } from "@/lib/safeOrgContext";

// ---------------------------------------------------------------------------
// GET  /api/sms — List SMS conversation threads for the org
// POST /api/sms — Send an outbound SMS message
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }

    const url = new URL(req.url);
    const contactId = url.searchParams.get("contactId");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

    if (contactId) {
      // Get conversation thread for a specific contact
      const messages = await prisma.sms_messages.findMany({
        where: { orgId: ctx.orgId, contactId },
        orderBy: { createdAt: "asc" },
        take: limit,
      });
      return apiOk({ messages, count: messages.length });
    }

    // Get conversation summaries (latest message per contact)
    const threads = await prisma.$queryRaw`
      SELECT DISTINCT ON (m."contactId")
        m.id,
        m."contactId",
        m.direction,
        m.body,
        m.status,
        m."createdAt",
        c."firstName",
        c."lastName",
        c.phone
      FROM sms_messages m
      LEFT JOIN contacts c ON c.id = m."contactId"
      WHERE m."orgId" = ${ctx.orgId}
        AND m."contactId" IS NOT NULL
      ORDER BY m."contactId", m."createdAt" DESC
    `;

    return apiOk({ threads, count: Array.isArray(threads) ? threads.length : 0 });
  } catch (err) {
    logger.error("[sms-get]", err);
    return apiError(500, "INTERNAL_ERROR", "Failed to fetch SMS threads");
  }
}

const SendSchema = z.object({
  contactId: z.string(),
  body: z.string().min(1, "Message body required").max(1600),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }

    // Rate limit SMS sends (prevents abuse)
    const rl = await checkRateLimit(ctx.userId || ctx.orgId, "API");
    if (!rl.success) {
      return apiError(429, "RATE_LIMIT", "Too many requests. Please try again later.");
    }

    const reqBody = await req.json().catch(() => null);
    if (!reqBody) return apiError(400, "INVALID_BODY", "Invalid JSON");

    const parsed = SendSchema.safeParse(reqBody);
    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Validation failed", parsed.error.errors);
    }

    const { contactId, body } = parsed.data;

    // Get contact and verify org ownership
    const contact = await prisma.contacts.findFirst({
      where: { id: contactId, orgId: ctx.orgId },
    });
    if (!contact) {
      return apiError(404, "CONTACT_NOT_FOUND", "Contact not found");
    }
    if (!contact.phone) {
      return apiError(400, "NO_PHONE", "Contact has no phone number");
    }

    // Send via Twilio
    let twilioResult: any = null;
    let status = "sent";

    const twilioSid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_NUMBER;

    if (twilioSid && twilioAuth && twilioFrom) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const twilioBody = new URLSearchParams({
          To: contact.phone,
          From: twilioFrom,
          Body: body,
        });
        const twilioRes = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: twilioBody,
        });
        twilioResult = await twilioRes.json();
        status = twilioRes.ok ? "sent" : "failed";
      } catch (err) {
        logger.error("[sms-send-twilio]", err);
        status = "failed";
      }
    } else {
      logger.warn("[sms-send] No Twilio credentials — message stored but not sent");
      status = "mock";
    }

    // Store the outbound message
    const message = await prisma.sms_messages.create({
      data: {
        id: crypto.randomUUID(),
        orgId: ctx.orgId,
        contactId: contact.id,
        direction: "outbound",
        from: twilioFrom || "system",
        to: contact.phone,
        body,
        externalId: twilioResult?.sid || null,
        status,
        sentBy: ctx.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return apiOk({ message, twilioStatus: status }, { status: 201 });
  } catch (err) {
    logger.error("[sms-post]", err);
    return apiError(500, "INTERNAL_ERROR", "Failed to send SMS");
  }
}
