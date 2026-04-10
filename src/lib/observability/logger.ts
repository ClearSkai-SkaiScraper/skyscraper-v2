/* eslint-disable no-console */
/**
 * Structured Logging with Context
 * Provides consistent logging across the application
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  /** User ID (if available) */
  userId?: string;
  /** Organization ID (if available) */
  orgId?: string;
  /** Claim ID (if in claim context) */
  claimId?: string;
  /** Report ID (if in report context) */
  reportId?: string;
  /** Request ID (for tracing) */
  requestId?: string;
  /** Additional metadata */
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class StructuredLogger {
  private static instance: StructuredLogger;
  private minLevel: LogLevel = "info";

  private constructor() {
    // Set min level from environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    if (
      envLevel === "debug" ||
      envLevel === "info" ||
      envLevel === "warn" ||
      envLevel === "error"
    ) {
      this.minLevel = envLevel;
    }
  }

  public static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    const minIndex = levels.indexOf(this.minLevel);
    const currentIndex = levels.indexOf(level);
    return currentIndex >= minIndex;
  }

  private formatEntry(entry: LogEntry): string {
    const { timestamp, level, message, context, error } = entry;

    // Build log string
    let log = `[${timestamp}] [${level.toUpperCase()}]`;

    // Add context
    if (context) {
      if (context.userId) log += ` [user:${context.userId}]`;
      if (context.orgId) log += ` [org:${context.orgId}]`;
      if (context.claimId) log += ` [claim:${context.claimId}]`;
      if (context.requestId) log += ` [req:${context.requestId}]`;
    }

    log += ` ${message}`;

    // Add error details
    if (error) {
      log += `\n  Error: ${error.name}: ${error.message}`;
      if (error.stack && this.shouldLog("debug")) {
        log += `\n  Stack: ${error.stack}`;
      }
    }

    // Add additional context
    if (context) {
      const extraContext = { ...context };
      delete extraContext.userId;
      delete extraContext.orgId;
      delete extraContext.claimId;
      delete extraContext.reportId;
      delete extraContext.requestId;

      if (Object.keys(extraContext).length > 0) {
        log += `\n  Context: ${JSON.stringify(extraContext)}`;
      }
    }

    return log;
  }

  private output(entry: LogEntry): void {
    const formatted = this.formatEntry(entry);

    switch (entry.level) {
      case "debug":
        console.debug(formatted);
        break;
      case "info":
        logger.debug("formatted", { formatted });
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        break;
    }

    // Optionally send to external logging service (Datadog, LogRocket, etc.)
    // this.sendToExternalService(entry);
  }

  public debug(message: string, context?: LogContext): void {
    if (!this.shouldLog("debug")) return;

    this.output({
      timestamp: new Date().toISOString(),
      level: "debug",
      message,
      context,
    });
  }

  public info(message: string, context?: LogContext): void {
    if (!this.shouldLog("info")) return;

    this.output({
      timestamp: new Date().toISOString(),
      level: "info",
      message,
      context,
    });
  }

  public warn(message: string, context?: LogContext): void {
    if (!this.shouldLog("warn")) return;

    this.output({
      timestamp: new Date().toISOString(),
      level: "warn",
      message,
      context,
    });
  }

  public error(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog("error")) return;

    this.output({
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  /**
   * Create a child logger with preset context
   * Useful for maintaining context across multiple log calls
   */
  public child(baseContext: LogContext): ContextLogger {
    return new ContextLogger(this, baseContext);
  }
}

/**
 * Context Logger
 * Maintains context across multiple log calls
 */
class ContextLogger {
  constructor(
    private logger: StructuredLogger,
    private baseContext: LogContext
  ) {}

  private mergeContext(context?: LogContext): LogContext {
    return { ...this.baseContext, ...context };
  }

  public debug(message: string, context?: LogContext): void {
    this.logger.debug(message, this.mergeContext(context));
  }

  public info(message: string, context?: LogContext): void {
    this.logger.info(message, this.mergeContext(context));
  }

  public warn(message: string, context?: LogContext): void {
    this.logger.warn(message, this.mergeContext(context));
  }

  public error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, error, this.mergeContext(context));
  }
}

// Export singleton instance
export const logger = StructuredLogger.getInstance();

// Export factory for context loggers
export function createLogger(context: LogContext): ContextLogger {
  return logger.child(context);
}

// Convenience functions for common operations
export function logApiRequest(params: {
  method: string;
  path: string;
  userId?: string;
  orgId?: string;
  duration?: number;
  status?: number;
}): void {
  logger.info(`API ${params.method} ${params.path}`, {
    userId: params.userId,
    orgId: params.orgId,
    duration: params.duration,
    status: params.status,
  });
}

export function logAIGeneration(params: {
  type: "supplement" | "rebuttal" | "report";
  claimId: string;
  userId: string;
  orgId: string;
  duration: number;
  tokensUsed?: number;
  success: boolean;
  error?: string;
}): void {
  const message = `AI generation ${params.type} ${params.success ? "completed" : "failed"}`;

  if (params.success) {
    logger.info(message, {
      claimId: params.claimId,
      userId: params.userId,
      orgId: params.orgId,
      duration: params.duration,
      tokensUsed: params.tokensUsed,
    });
  } else {
    logger.error(message, undefined, {
      claimId: params.claimId,
      userId: params.userId,
      orgId: params.orgId,
      duration: params.duration,
      error: params.error,
    });
  }
}

export function logImport(params: {
  claimId: string;
  source: "ADJUSTER" | "CONTRACTOR";
  format: "CSV" | "XML";
  itemCount: number;
  userId: string;
  orgId: string;
  success: boolean;
  error?: string;
}): void {
  const message = `Import ${params.source} ${params.format} ${params.success ? "completed" : "failed"}`;

  if (params.success) {
    logger.info(message, {
      claimId: params.claimId,
      userId: params.userId,
      orgId: params.orgId,
      itemCount: params.itemCount,
    });
  } else {
    logger.error(message, undefined, {
      claimId: params.claimId,
      userId: params.userId,
      orgId: params.orgId,
      error: params.error,
    });
  }
}

export function logCacheOperation(params: {
  operation: "hit" | "miss" | "set" | "invalidate";
  key: string;
  duration?: number;
}): void {
  logger.debug(`Cache ${params.operation}: ${params.key}`, {
    duration: params.duration,
  });
}
