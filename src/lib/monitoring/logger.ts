import { randomUUID } from "crypto";
import pino, { LoggerOptions } from "pino";

// Correlation ID generation (fallback if none provided per request)
export function createCorrelationId(): string {
  return randomUUID();
}

// Build base logger with redaction + level controls
const options: LoggerOptions = {
  // eslint-disable-next-line no-restricted-syntax
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: ["req.headers.authorization", "user.token"],
    censor: "[REDACTED]",
  },
  base: {
    // eslint-disable-next-line no-restricted-syntax
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logApiStart(l = logger, meta: Record<string, any>) {
  l.info({ event: "api:start", ...meta }, "API handler start");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logApiSuccess(l = logger, meta: Record<string, any>) {
  l.info({ event: "api:success", ...meta }, "API handler success");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logApiError(l = logger, meta: Record<string, any>, error: unknown) {
  l.error({ event: "api:error", error, ...meta }, "API handler error");
}
