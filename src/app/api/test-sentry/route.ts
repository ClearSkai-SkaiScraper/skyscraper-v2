/**
 * 🧪 Sentry Test Endpoint
 *
 * Triggers a test error to verify Sentry is capturing production errors.
 *
 * Usage: GET /api/test-sentry
 *
 * This endpoint should be removed after verification,
 * or protected behind admin auth.
 */

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const confirm = searchParams.get("confirm");

  // Require confirmation to prevent accidental triggers
  if (confirm !== "yes") {
    return NextResponse.json(
      {
        message: "Sentry test endpoint",
        usage: "Add ?confirm=yes to trigger a test error",
        warning: "This will create an error in your Sentry dashboard",
      },
      { status: 200 }
    );
  }

  // Log the test
  logger.info("[SENTRY_TEST] Triggering test error");

  // Throw an error that Sentry will capture
  throw new Error("🧪 Sentry Test Error — This is a test to verify error tracking is working");
}
