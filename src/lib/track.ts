import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface TrackEventPayload {
  name: string;
  report_id?: string;
  props?: Record<string, unknown> | null;
}

/**
 * Sanitize error context to prevent logging sensitive data
 * Removes: passwords, tokens, API keys, auth headers, cookies, SSN, credit cards
 */
function sanitizeErrorContext(ctx: unknown): unknown {
  if (!ctx || typeof ctx !== "object") return ctx;

  const safe = { ...(ctx as Record<string, unknown>) } as Record<string, unknown>;
  const sensitiveKeys = [
    "password",
    "token",
    "authorization",
    "api_key",
    "secret",
    "ssn",
    "credit_card",
    "apikey",
    "api-key",
  ];

  // Remove sensitive top-level keys
  for (const key of sensitiveKeys) {
    if (key in safe) delete safe[key];
  }

  // Sanitize headers if present
  const headers = safe.headers;
  if (headers && typeof headers === "object") {
    const h = { ...(headers as Record<string, unknown>) } as Record<string, unknown>;
    delete h.authorization;
    delete h.cookie;
    delete h["api-key"];
    safe.headers = h;
  }

  return safe;
}

/**
 * Track user events for analytics
 * Examples: 'ai.summary', 'ai.mockup', 'export.pdf', 'share.create', 'share.view', 'payment.paid', 'esign.completed'
 */
export async function track(
  name: string,
  payload: { report_id?: string; props?: Record<string, unknown> | null } = {}
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Supabase table typings may be strict; keep the runtime behavior and use a localized cast.
    await supabase.from("events").insert({
      name,
      userId: user.id,
      report_id: payload.report_id || null,
      props: payload.props || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  } catch (error: unknown) {
    const e = error instanceof Error ? error : new Error(String(error));
    logger.error("Failed to track event:", e);
  }
}

/**
 * Log errors to the error_logs table
 */
/**
 * Log errors to the error_logs table
 * Note: Context is automatically sanitized to remove sensitive data
 */
export async function logError({
  report_id,
  severity = "error",
  source,
  code,
  message,
  context,
}: {
  report_id?: string;
  severity?: "info" | "warn" | "error" | "critical";
  source: string;
  code?: string;
  message: string;
  context?: unknown;
}) {
  try {
    await supabase.from("error_logs").insert({
      report_id: report_id || null,
      severity,
      source,
      code: code || null,
      message,
      context: sanitizeErrorContext(context),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  } catch (error: unknown) {
    const e = error instanceof Error ? error : new Error(String(error));
    logger.error("Failed to log error:", e);
  }
}
