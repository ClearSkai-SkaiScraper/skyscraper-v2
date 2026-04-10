import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { withDbSpan } from "@/lib/monitoring/dbSpan";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { verifyCronSecret } from "@/lib/cron/verifyCronSecret";

// Scheduled by vercel.json every 30 minutes
export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;
  const started = Date.now();
  try {
    const rows = await withDbSpan(
      "users.columns",
      () =>
        prisma.$queryRaw<
          Array<{ column_name: string }>
        >`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`
    );
    const present = rows.map((r) => r.column_name);
    const required = [
      "title",
      "phone",
      "headshot_url",
      "public_skills",
      "job_history",
      "client_testimonials",
      "earned_badges",
      "years_experience",
    ];
    const missing = required.filter((c) => !present.includes(c));
    if (missing.length) {
      Sentry.captureMessage("CRON: User profile column drift detected", {
        level: "error",
        contexts: { drift: { missing, present } },
      });
      if (process.env.SLACK_ALERT_WEBHOOK_URL) {
        try {
          await fetch(process.env.SLACK_ALERT_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: `:warning: Schema drift detected (users table) missing columns: ${missing.join(", ")}`,
            }),
          });
        } catch (_e) {
          Sentry.captureMessage("Slack notification failed (schema drift)", { level: "warning" });
        }
      }
    }
    return NextResponse.json({
      ok: missing.length === 0,
      missing,
      present,
      ms: Date.now() - started,
    });
  } catch (e) {
    Sentry.captureException(e, { tags: { cron: "user-columns" } });
    return NextResponse.json(
      { ok: false, error: "Internal server error", ms: Date.now() - started },
      { status: 500 }
    );
  }
}
