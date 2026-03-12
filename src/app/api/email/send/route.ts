/**
 * POST /api/email/send
 *
 * Generic email sending endpoint using Resend.
 * Wires up email-from-app flows (Project Plan Builder, etc.)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { safeOrgContext } from "@/lib/safeOrgContext";

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

    const body = await req.json();
    const { to, subject, text, html } = body;

    if (!to || !subject) {
      return NextResponse.json({ error: "to and subject are required" }, { status: 400 });
    }

    // Use Resend if configured
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      logger.warn("[EMAIL_SEND] RESEND_API_KEY not configured, email not sent");
      return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);

    const fromAddress = process.env.RESEND_FROM_EMAIL || "notifications@skaiscrape.com";

    const result = await resend.emails.send({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      text: text || undefined,
      html: html || undefined,
    });

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
