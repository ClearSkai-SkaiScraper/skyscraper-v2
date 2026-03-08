export const dynamic = "force-dynamic";
import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/dev/sentry-test
 *
 * Dev-only endpoint to verify Sentry is capturing errors.
 * Returns 200 with confirmation — never breaks the app.
 *
 * ?mode=handled   → captures a handled error (default)
 * ?mode=unhandled → throws an unhandled error (Sentry auto-captures)
 * ?mode=message   → sends a Sentry message (no error)
 *
 * ⚠️  Gated to non-production environments.
 */
export async function GET(req: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const mode = req.nextUrl.searchParams.get("mode") || "handled";

  if (mode === "unhandled") {
    // Sentry auto-captures unhandled errors via its global handler
    throw new Error("[sentry-test] Intentional unhandled error for Sentry verification");
  }

  if (mode === "message") {
    Sentry.captureMessage("[sentry-test] Test message from /api/dev/sentry-test", "info");
    return NextResponse.json({
      ok: true,
      mode: "message",
      detail: "Sentry.captureMessage sent — check Sentry dashboard for info-level event",
    });
  }

  // Default: handled error
  try {
    throw new Error("[sentry-test] Intentional handled error for Sentry verification");
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({
      ok: true,
      mode: "handled",
      detail: "Sentry.captureException sent — check Sentry dashboard for error event",
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ? "configured" : "MISSING",
      environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV,
    });
  }
}
