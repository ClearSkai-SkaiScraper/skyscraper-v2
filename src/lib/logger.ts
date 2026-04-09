/* eslint-disable no-restricted-syntax, no-console */
// ============================================================================
// H-13: Structured Logger Utility — Sentry-Integrated
// ============================================================================
//
// Every warn/error call auto-creates a Sentry breadcrumb so production issues
// carry the full context trail. Debug-level logs are console-only (dev mode).

import * as Sentry from "@sentry/nextjs";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  orgId?: string;
  claimId?: string;
  requestId?: string;
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};

  setContext(ctx: LogContext) {
    this.context = { ...this.context, ...ctx };
  }

  private log(level: LogLevel, message: string, meta?: unknown) {
    const timestamp = new Date().toISOString();
    const metaObj: Record<string, unknown> =
      meta && typeof meta === "object" ? (meta as Record<string, unknown>) : {};
    const logEntry: Record<string, unknown> = {
      timestamp,
      level,
      message,
      ...this.context,
      ...metaObj,
    };

    // Console output with color coding
    const colors = {
      debug: "\x1b[36m", // Cyan
      info: "\x1b[32m", // Green
      warn: "\x1b[33m", // Yellow
      error: "\x1b[31m", // Red
    };
    const reset = "\x1b[0m";

    console.log(
      `${colors[level]}[${level.toUpperCase()}]${reset} ${timestamp} - ${message}`,
      meta ? JSON.stringify(meta, null, 2) : ""
    );

    // ── Sentry breadcrumbs for warn + error ──────────────────────────
    if (level === "warn" || level === "error" || level === "info") {
      try {
        Sentry.addBreadcrumb({
          category: "logger",
          message,
          level: level === "error" ? "error" : level === "warn" ? "warning" : "info",
          data: {
            ...this.context,
            ...(meta && typeof meta === "object" ? meta : { detail: meta }),
          },
          timestamp: Date.now() / 1000,
        });
      } catch {
        // Sentry may not be initialized in all contexts — silently skip
      }
    }

    // ── Sentry captureException for errors ───────────────────────────
    if (level === "error" && meta) {
      try {
        const metaRecord =
          meta && typeof meta === "object" ? (meta as Record<string, unknown>) : null;
        const err =
          meta instanceof Error
            ? meta
            : metaRecord?.error instanceof Error
              ? metaRecord.error
              : null;
        if (err) {
          Sentry.captureException(err, {
            extra: logEntry,
            tags: {
              logSource: "logger",
              ...(this.context.orgId && { orgId: this.context.orgId }),
            },
          });
        }
      } catch {
        // Sentry not available — no-op
      }
    }
  }

  debug(message: string, meta?: unknown) {
    if (process.env.NODE_ENV === "development") {
      this.log("debug", message, meta);
    }
  }

  info(message: string, meta?: unknown) {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: unknown) {
    this.log("warn", message, meta);
  }

  error(message: string, error?: Error | unknown, meta?: unknown) {
    this.log("error", message, {
      error: error instanceof Error ? error.message : String(error ?? ""),
      stack: error instanceof Error ? error.stack : undefined,
      ...(meta && typeof meta === "object" ? meta : {}),
    });
  }

  // Performance tracking
  startTimer(label: string) {
    const start = performance.now();
    return {
      end: (meta?: Record<string, unknown>) => {
        const duration = performance.now() - start;
        this.info(`${label} completed`, { duration: `${duration.toFixed(2)}ms`, ...meta });
      },
    };
  }
}

export const logger = new Logger();

// Convenience export as "log" for backwards compatibility
export const log = logger;

// Export convenience function for API routes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withLogging(handler: (...args: any[]) => Promise<unknown>, context: string) {
  return async (...args: unknown[]) => {
    const timer = logger.startTimer(context);
    try {
      const result = await handler(...args);
      timer.end({ status: "success" });
      return result;
    } catch (error) {
      logger.error(`${context} failed`, error);
      timer.end({ status: "error" });
      throw error;
    }
  };
}
