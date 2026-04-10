/**
 * POST /api/email/send
 *
 * Generic email sending endpoint using Resend.
 * Wires up email-from-app flows (Project Plan Builder, etc.)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { safeOrgContext } from "@/lib/safeOrgContext";

const emailSendSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1).max(50)]),
  subject: z.string().min(1, "Subject is required").max(500),
  text: z.string().max(50_000).optional(),
  html: z.string().max(200_000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit email sending to prevent abuse
    const rl = await checkRateLimit(ctx.orgId, "AI");
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const raw = await req.json();
    const parsed = emailSendSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { to, subject, text, html } = parsed.data;

    // Use Resend if configured
    // eslint-disable-next-line no-restricted-syntax
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      logger.warn("[EMAIL_SEND] RESEND_API_KEY not configured, email not sent");
      return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);

    // eslint-disable-next-line no-restricted-syntax
    const fromAddress = process.env.RESEND_FROM_EMAIL || "notifications@skaiscrape.com";

    const result = await resend.emails.send({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      ...(html ? { html } : { text: text || "" }),
    } as Parameters<typeof resend.emails.send>[0]);

    logger.info("[EMAIL_SEND] Email sent", {
      orgId: ctx.orgId,
      to,
      subject,
      messageId: result.data?.id,
    });

    return NextResponse.json({ success: true, messageId: result.data?.id });
  } catch (error) {
    logger.error("[EMAIL_SEND] Error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
