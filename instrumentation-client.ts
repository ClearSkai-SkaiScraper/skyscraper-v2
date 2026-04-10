/**
 * Sentry Client Configuration (Browser)
 * Error tracking and performance monitoring for client-side code
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
const ENVIRONMENT =
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
  process.env.SENTRY_ENVIRONMENT ||
  process.env.NODE_ENV ||
  "development";
const IS_DEV = ENVIRONMENT === "development";

// Sensitive keys to scrub from all events
const SENSITIVE_KEYS = [
  "OPENAI_API_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "CLERK_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "authorization",
  "cookie",
  "set-cookie",
  "access_token",
  "refresh_token",
  "api_key",
  "apiKey",
  "password",
  "secret",
  "token",
];

Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,

  // Send user IP + request headers for better debugging
  sendDefaultPii: true,

  // Performance Monitoring
  tracesSampleRate: IS_DEV
    ? 1.0
    : parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "0.1"),

  // Profiling — enabled for enterprise performance visibility
  profilesSampleRate: IS_DEV ? 0.0 : 0.1,

  // Enable Sentry Logs (structured log-to-trace correlation)
  enableLogs: true,

  // Debug mode (only in dev)
  debug: IS_DEV && process.env.NEXT_PUBLIC_SENTRY_DEBUG === "true",

  // Capture console errors
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Session Replay
  replaysSessionSampleRate: IS_DEV ? 1.0 : 0.01, // 1% of sessions
  replaysOnErrorSampleRate: IS_DEV ? 1.0 : 1.0, // 100% of error sessions recorded

  // PII Scrubbing - runs before sending events to Sentry
  beforeSend(event) {
    // Remove sensitive headers
    if (event.request?.headers) {
      const headers = event.request.headers;
      SENSITIVE_KEYS.forEach((key) => {
        if (headers[key]) {
          headers[key] = "[Filtered]";
        }
        if (headers[key.toLowerCase()]) {
          headers[key.toLowerCase()] = "[Filtered]";
        }
      });
    }

    // Remove cookies
    if (event.request?.cookies) {
      event.request.cookies = {};
    }

    // Scrub request data for sensitive keys
    if (event.request?.data) {
      const data =
        typeof event.request.data === "string"
          ? JSON.parse(event.request.data)
          : event.request.data;

      SENSITIVE_KEYS.forEach((key) => {
        if (data && typeof data === "object" && key in data) {
          data[key] = "[Filtered]";
        }
      });

      event.request.data = typeof event.request.data === "string" ? JSON.stringify(data) : data;
    }

    // Scrub extra context
    if (event.extra) {
      Object.keys(event.extra).forEach((key) => {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk.toLowerCase()))) {
          event.extra![key] = "[Filtered]";
        }
      });
    }

    // Scrub breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data) {
          Object.keys(breadcrumb.data).forEach((key) => {
            const lowerKey = key.toLowerCase();
            if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk.toLowerCase()))) {
              breadcrumb.data![key] = "[Filtered]";
            }
          });
        }
        return breadcrumb;
      });
    }

    return event;
  },
});
export * from "./src/instrumentation-client";
