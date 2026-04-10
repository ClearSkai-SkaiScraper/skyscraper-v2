import * as Sentry from "@sentry/nextjs";

// ══════════════════════════════════════════════════════════════════════════
// Sensitive Keys to Filter (PII + API Keys)
// ══════════════════════════════════════════════════════════════════════════
const SENSITIVE_KEYS = [
  "OPENAI_API_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "CLERK_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "SENTRY_AUTH_TOKEN",
  "password",
  "token",
  "authorization",
  "cookie",
  "session",
  "ssn",
  "email",
  "phone",
  "credit_card",
  "api_key",
  "secret",
  "private_key",
  "access_token",
  "refresh_token",
];

// ══════════════════════════════════════════════════════════════════════════
// Sentry Edge Configuration (Edge Runtime)
// ══════════════════════════════════════════════════════════════════════════
Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment:
    process.env.SENTRY_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "development",

  // Send user IP + request headers for better debugging
  sendDefaultPii: true,

  // Lower sampling for edge (lightweight runtime)
  tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
    ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
    : process.env.NODE_ENV === "production"
      ? 0.05
      : 1.0,

  // Enable Sentry Logs (structured log-to-trace correlation)
  enableLogs: true,

  // Debug only in development with explicit flag
  debug: process.env.SENTRY_DEBUG === "true" && process.env.NODE_ENV !== "production",

  // Release tracking (Vercel)
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // ════════════════════════════════════════════════════════════════════════
  // PII Scrubbing Hook
  // ════════════════════════════════════════════════════════════════════════
  beforeSend(event, hint) {
    // Filter health check noise
    const url = event.request?.url;
    if (url && (url.includes("/api/health") || url.includes("/_next/"))) {
      return null;
    }

    // Scrub request headers
    if (event.request?.headers) {
      const headers = event.request.headers as Record<string, any>;
      if (headers.authorization) headers.authorization = "[Filtered]";
      if (headers.cookie) headers.cookie = "[Filtered]";
      if (headers["set-cookie"]) headers["set-cookie"] = "[Filtered]";
    }

    // Scrub request cookies
    if (event.request?.cookies) {
      event.request.cookies = {};
    }

    // Scrub request data
    if (event.request?.data && typeof event.request.data === "object") {
      const data = event.request.data as Record<string, any>;
      SENSITIVE_KEYS.forEach((key) => {
        if (key.toLowerCase() in data) {
          data[key.toLowerCase()] = "[Filtered]";
        }
        if (key.toUpperCase() in data) {
          data[key.toUpperCase()] = "[Filtered]";
        }
      });
    }

    // Scrub event.extra
    if (event.extra && typeof event.extra === "object") {
      const extra = event.extra as Record<string, any>;
      SENSITIVE_KEYS.forEach((key) => {
        if (key in extra) {
          extra[key] = "[Filtered]";
        }
        if (key.toLowerCase() in extra) {
          extra[key.toLowerCase()] = "[Filtered]";
        }
        if (key.toUpperCase() in extra) {
          extra[key.toUpperCase()] = "[Filtered]";
        }
      });
    }

    // Scrub breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data && typeof breadcrumb.data === "object") {
          const data = breadcrumb.data as Record<string, any>;
          SENSITIVE_KEYS.forEach((key) => {
            if (key in data || key.toLowerCase() in data || key.toUpperCase() in data) {
              data[key] = "[Filtered]";
            }
          });
        }
        return breadcrumb;
      });
    }

    return event;
  },
});
