export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 120;

// CRON: EMAIL RETRY WORKER
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { Resend } from "resend";

import { verifyCronSecret } from "@/lib/cron/verifyCronSecret";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

let _resend: Resend | null = null;

function getResend() {
  // eslint-disable-next-line no-restricted-syntax
  if (!_resend && process.env.RESEND_API_KEY) {
    // eslint-disable-next-line no-restricted-syntax
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function GET(req: Request) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  try {
    // Fetch pending emails that haven't exceeded max attempts
    // Use raw query to compare attempts < maxAttempts per-record
    const batch = await prisma.emailQueue.findMany({
      where: {
        status: "pending",
        scheduledAt: { lte: new Date() },
      },
      orderBy: { scheduledAt: "asc" },
      take: 20,
    });

    // Filter to only items under their own maxAttempts
    const eligible = batch.filter((item) => item.attempts < item.maxAttempts);

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of eligible) {
      try {
        if (!item.toEmail) throw new Error("No recipient");

        await getResend()?.emails?.send({
          // eslint-disable-next-line no-restricted-syntax
          from: process.env.EMAIL_FROM || "ClearSkai <noreply@clearskai.com>",
          to: [item.toEmail],
          subject: item.subject,
          html: item.htmlBody || "<p>(no content)</p>",
        });

        await prisma.emailQueue.update({
          where: { id: item.id },
          data: {
            status: "sent",
            attempts: item.attempts + 1,
            processedAt: new Date(),
          },
        });

        sent++;
      } catch (error) {
        const errorMsg = String(error?.message || error);
        errors.push(errorMsg);

        const newAttempts = item.attempts + 1;
        await prisma.emailQueue.update({
          where: { id: item.id },
          data: {
            attempts: newAttempts,
            lastError: errorMsg,
            status: newAttempts >= (item.maxAttempts || 5) ? "failed" : "pending",
          },
        });

        failed++;

        // Sentry for persistent failures
        if (newAttempts >= 3) {
          Sentry.captureException(error, {
            tags: { component: "email-retry" },
            extra: { emailId: item.id, attempts: newAttempts },
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      processed: eligible.length,
      sent,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[CRON:EMAIL_RETRY] Fatal error:", error?.message || error);
    try {
      Sentry.captureException(error, { tags: { component: "email-retry-cron" } });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (__) {}
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
