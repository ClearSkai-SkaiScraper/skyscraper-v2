import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiHandler = (req: Request, ctx?: any) => Promise<Response> | Response;

/**
 * Wraps a Next.js App Router API handler with Sentry capture + uniform error JSON.
 * - Captures exceptions
 * - Adds minimal breadcrumb with method + path
 * - Returns 500 JSON on unhandled errors
 */
export function withSentryApi(handler: ApiHandler): ApiHandler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: Request, ctx?: any) => {
    Sentry.addBreadcrumb({
      category: "api",
      message: `${req.method} ${new URL(req.url).pathname}`,
      level: "info",
    });
    try {
      const res = await handler(req, ctx);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return res instanceof Response ? res : NextResponse.json(res as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      Sentry.captureException(error, {
        tags: { api: new URL(req.url).pathname },
      });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

/** Simple helper to capture and rethrow while enriching error context */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function captureAndRethrow(error: unknown, context?: Record<string, any>) {
  Sentry.captureException(error, { extra: context });
  throw error;
}