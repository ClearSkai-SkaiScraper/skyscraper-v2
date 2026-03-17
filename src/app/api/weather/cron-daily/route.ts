// src/app/api/weather/cron-daily/route.ts

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { runDailyWeatherIngest } from "@/jobs/ingestWeather";
import { verifyCronSecret } from "@/lib/cron/verifyCronSecret";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const result = await runDailyWeatherIngest();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    logger.error("[CRON] Weather ingest failed:", error);
    Sentry.captureException(error, { tags: { component: "cron-weather" } });
    return NextResponse.json(
      { ok: false, error: "Weather ingest failed" },
      { status: 500 }
    );
  }
}
