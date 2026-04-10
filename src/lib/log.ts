/* eslint-disable no-console */
import { logger } from "@/lib/logger";

/**
 * Structured Logging Utilities
 * Provides consistent logging with metadata for production observability
 */

type LogLevel = "info" | "warn" | "error";

export interface LogContext {
  orgId?: string;
  userId?: string;
  claimId?: string;
  leadId?: string;
  route?: string;
  duration?: number;
  status?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  context: LogContext;
  message?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Format a log entry for structured output
 */
function formatLogEntry(
  level: LogLevel,
  event: string,
  context: LogContext,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    context,
  };

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return entry;
}

/**
 * Send log to console with structured format
 */
function emitLog(entry: LogEntry): void {
  const { level } = entry;

  // In production, these logs will be captured by Vercel
  const logMethod =
    level === "error" ? console.error : level === "warn" ? console.warn : console.log;

  logMethod(
    JSON.stringify({
      ...entry,
      // Add additional metadata for Vercel logs
      // eslint-disable-next-line no-restricted-syntax
      env: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
      // eslint-disable-next-line no-restricted-syntax
      commitSha: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "local",
    })
  );

  // Also log human-readable format in development
  // eslint-disable-next-line no-restricted-syntax
  if (process.env.NODE_ENV === "development") {
    const emoji = level === "error" ? "❌" : level === "warn" ? "⚠️" : "ℹ️";
    logger.debug(`${emoji} [${entry.event}]`, {
      ...entry.context,
      error: entry.error || undefined,
    });
  }
}

/**
 * Log an informational event
 * Use for: successful operations, state changes, important milestones
 */
export function logInfo(event: string, context: LogContext = {}): void {
  const entry = formatLogEntry("info", event, context);
  emitLog(entry);
}

/**
 * Log a warning event
 * Use for: recoverable errors, deprecated usage, performance issues
 */
export function logWarn(event: string, context: LogContext = {}, error?: Error): void {
  const entry = formatLogEntry("warn", event, context, error);
  emitLog(entry);
}

/**
 * Log an error event
 * Use for: failures, exceptions, data integrity issues
 */
export function logError(event: string, context: LogContext = {}, error?: Error): void {
  const entry = formatLogEntry("error", event, context, error);
  emitLog(entry);

  // In production, you might want to send to external error tracking
  // Example: Sentry.captureException(error, { contexts: { custom: context } });
}

/**
 * Create a logger with pre-filled context
 * Useful for maintaining context throughout a request lifecycle
 */
export function createLogger(baseContext: LogContext) {
  return {
    info: (event: string, additionalContext: LogContext = {}) =>
      logInfo(event, { ...baseContext, ...additionalContext }),
    warn: (event: string, additionalContext: LogContext = {}, error?: Error) =>
      logWarn(event, { ...baseContext, ...additionalContext }, error),
    error: (event: string, additionalContext: LogContext = {}, error?: Error) =>
      logError(event, { ...baseContext, ...additionalContext }, error),
  };
}

/**
 * Extract common context from Next.js request
 */
export function extractRequestContext(req: Request): LogContext {
  const url = new URL(req.url);
  return {
    route: url.pathname,
    method: req.method,
    userAgent: req.headers.get("user-agent") || "unknown",
  };
}

/**
 * Measure and log function execution time
 */
export async function measureExecution<T>(
  event: string,
  context: LogContext,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logInfo(event, { ...context, duration, status: "success" });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logError(event, { ...context, duration, status: "failed" }, error as Error);
    throw error;
  }
}

// Specialized loggers for common modules
export const aiLogger = createLogger({ module: "ai" });
export const uploadLogger = createLogger({ module: "upload" });
export const authLogger = createLogger({ module: "auth" });
export const networkLogger = createLogger({ module: "network" });

/**
 * Time execution of async function (backwards compatibility)
 */
export async function timeExecution<T>(label: string, fn: () => Promise<T>): Promise<T> {
  return measureExecution(label, {}, fn);
}
