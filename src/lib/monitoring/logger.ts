import { randomUUID } from "crypto";
import pino, { LoggerOptions } from "pino";

// Correlation ID generation (fallback if none provided per request)
export function createCorrelationId(): string {
  return randomUUID();
}

// Build base logger with redaction + level controls
const options: LoggerOptions = {
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: ["req.headers.authorization", "user.token"],
    censor: "[REDACTED]",
  },
  base: {
    env: process.env.NODE_ENV,
    service: "skaiscraper",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

export const logger = pino(options);

// Child logger builder with correlation + user/org context
export function requestLogger(ctx: {
  correlationId?: string;
  userId?: string | null;
  orgId?: string | null;
}) {
  return logger.child({
    correlationId: ctx.correlationId || createCorrelationId(),
    userId: ctx.userId || undefined,
    orgId: ctx.orgId || undefined,
  });
}

export function logApiStart(l = logger, meta: Record<string, any>) {
  l.info({ event: "api:start", ...meta }, "API handler start");
}

export function logApiSuccess(l = logger, meta: Record<string, any>) {
  l.info({ event: "api:success", ...meta }, "API handler success");
}

export function logApiError(l = logger, meta: Record<string, any>, error: unknown) {
  l.error({ event: "api:error", error, ...meta }, "API handler error");
}
