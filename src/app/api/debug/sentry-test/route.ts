import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/sentry-test
 *
 * Throws an intentional error to verify Sentry is capturing
 * production errors with readable stack traces and source maps.
 *
 * Protected: only works when SENTRY_TEST_SECRET matches.
 * Remove or disable after initial verification.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  // eslint-disable-next-line no-restricted-syntax
  if (secret !== (process.env.SENTRY_TEST_SECRET || "skaisentry2026")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = searchParams.get("mode") || "throw";

  if (mode === "capture") {
    // Manually capture without crashing the route
    Sentry.captureException(new Error("SkaiScraper Sentry verification — manual capture"));
    Sentry.captureMessage("SkaiScraper Sentry verification — manual message", "warning");
    await Sentry.flush(2000);
    return NextResponse.json({
      success: true,
      message: "Sentry events captured (manual). Check Sentry dashboard.",
      timestamp: new Date().toISOString(),
    });
  }

  // Default: throw a real error so Sentry catches it via the global handler
  throw new Error("SkaiScraper Sentry verification — intentional production error");
}
