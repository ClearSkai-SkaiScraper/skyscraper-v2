// Unified API wrappers: use Upstash singleton to avoid creating multiple REST clients.
import * as Sentry from "@sentry/nextjs";
import { Ratelimit } from "@upstash/ratelimit";

import { upstash } from "@/lib/upstash";

// Create limiter only if Redis is configured; otherwise use a no-op fallback
const limiter: Ratelimit | null = upstash
  ? new Ratelimit({ redis: upstash, limiter: Ratelimit.slidingWindow(20, "1 m") })
  : null;

// ApiHandler uses Request (not NextRequest) for compatibility with withOrgScope
export type ApiHandler = (req: Request, ctx: any) => Promise<Response>;

export function withSentryApi(handler: ApiHandler): ApiHandler {
  return async (req, ctx) => {
    const url = new URL(req.url);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const txn = Sentry.startSpan(
      { name: `API ${req.method} ${url.pathname}`, op: "http.server" },
      () => undefined
    );
    try {
      // Enrich Sentry context with route info
      Sentry.setTag("api.route", url.pathname);
      Sentry.setTag("api.method", req.method);

      // Set user context if available from ctx (from withOrgScope)
      if (ctx?.auth?.userId) {
        Sentry.setUser({ id: ctx.auth.userId });
        Sentry.setTag("org.id", ctx.auth.orgId || "none");
      }

      return await handler(req, ctx);
    } catch (err: any) {
      Sentry.captureException(err, {
        tags: {
          "api.route": url.pathname,
          "api.method": req.method,
        },
      });
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  };
}

export function withRateLimit(handler: ApiHandler): ApiHandler {
  return async (req, ctx) => {
    // If limiter not available, fail open
    if (!limiter) {
      return handler(req, ctx);
    }
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    try {
      const { success, reset, remaining } = await limiter.limit(ip);
      if (!success) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 });
      }
      const res = await handler(req, ctx);
      res.headers.set("x-ratelimit-remaining", remaining.toString());
      res.headers.set("x-ratelimit-reset", reset.toString());
      return res;
    } catch (_e) {
      // Fail open if rate limiter errors
      return handler(req, ctx);
    }
  };
}

// withOrgScope REMOVED — was reading from spoofable HTTP headers.
// Use withOrgScope from "@/lib/auth/tenant" instead (Clerk + DB-backed).

// safeAuth REMOVED — was catching ORG_CONTEXT_MISSING from the old header-based withOrgScope.
// Use withOrgScope from "@/lib/auth/tenant" for proper Clerk + DB-backed auth.

export function compose(
  ...layers: ((h: ApiHandler) => ApiHandler)[]
): (h: ApiHandler) => ApiHandler {
  return (h: ApiHandler) => layers.reduceRight((acc, layer) => layer(acc), h);
}
