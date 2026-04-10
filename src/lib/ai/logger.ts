/**
 * AI Logger
 *
 * Comprehensive logging system for all AI operations:
 * - Execution tracking
 * - Error monitoring
 * - Performance metrics
 * - Audit trail
 */

import fs from "fs";
import path from "path";

import { logger } from "@/lib/logger";

const LOG_DIR = path.join(process.cwd(), "logs", "ai");

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export interface AILogEntry {
  timestamp: string;
  task: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  result?: {
    success: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
    error?: string;
  };
  executionTime: number;
  claimId?: string;
  userId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

/**
 * Get log file path for today
 */
function getLogFilePath(): string {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return path.join(LOG_DIR, `${date}.jsonl`);
}

/**
 * Log AI operation
 */
export function logAIOperation(entry: AILogEntry): void {
  try {
    const logFile = getLogFilePath();
    const logLine = JSON.stringify(entry) + "\n";

    fs.appendFileSync(logFile, logLine, "utf8");
  } catch (error) {
    logger.error("[AILogger] Failed to write log:", error);
  }
}

/**
 * Log successful AI operation
 */
export function logSuccess(
  task: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  executionTime: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
): void {
  logAIOperation({
    timestamp: new Date().toISOString(),
    task,
    payload,
    result: {
      success: true,
      data,
    },
    executionTime,
    ...metadata,
  });
}

/**
 * Log failed AI operation
 */
export function logError(
  task: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
  error: string,
  executionTime: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
): void {
  logAIOperation({
    timestamp: new Date().toISOString(),
    task,
    payload,
    result: {
      success: false,
      error,
    },
    executionTime,
    ...metadata,
  });
}

/**
 * Read logs for a specific date
 */
export function readLogs(date: string): AILogEntry[] {
  try {
    const logFile = path.join(LOG_DIR, `${date}.jsonl`);

    if (!fs.existsSync(logFile)) {
      return [];
    }

    const content = fs.readFileSync(logFile, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);

    return lines.map((line) => JSON.parse(line));
  } catch (error) {
    logger.error("[AILogger] Failed to read logs:", error);
    return [];
  }
}

/**
 * Get logs for a specific claim
 */
export function getClaimLogs(claimId: string, date?: string): AILogEntry[] {
  const logs = date ? readLogs(date) : readLogsForDateRange(7); // Last 7 days by default
  return logs.filter((entry) => entry.claimId === claimId);
}

/**
 * Get logs for a specific task
 */
export function getTaskLogs(task: string, date?: string): AILogEntry[] {
  const logs = date ? readLogs(date) : readLogsForDateRange(7);
  return logs.filter((entry) => entry.task === task);
}

/**
 * Read logs for multiple days
 */
function readLogsForDateRange(days: number): AILogEntry[] {
  const logs: AILogEntry[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const dayLogs = readLogs(dateStr);
    logs.push(...dayLogs);
  }

  return logs;
}

/**
 * Get statistics for AI operations
 */
export function getStatistics(days: number = 7): {
  totalOperations: number;
  successRate: number;
  averageExecutionTime: number;
  taskBreakdown: Record<string, number>;
  errorBreakdown: Record<string, number>;
} {
  const logs = readLogsForDateRange(days);

  const totalOperations = logs.length;
  const successful = logs.filter((log) => log.result?.success).length;
  const successRate = totalOperations > 0 ? successful / totalOperations : 0;

  const totalTime = logs.reduce((sum, log) => sum + log.executionTime, 0);
  const averageExecutionTime = totalOperations > 0 ? totalTime / totalOperations : 0;

  const taskBreakdown: Record<string, number> = {};
  const errorBreakdown: Record<string, number> = {};

  logs.forEach((log) => {
    taskBreakdown[log.task] = (taskBreakdown[log.task] || 0) + 1;

    if (!log.result?.success && log.result?.error) {
      errorBreakdown[log.result.error] = (errorBreakdown[log.result.error] || 0) + 1;
    }
  });

  return {
    totalOperations,
    successRate,
    averageExecutionTime,
    taskBreakdown,
    errorBreakdown,
  };
}

/**
 * Clean old logs (older than N days)
 */
export function cleanOldLogs(keepDays: number = 30): number {
  try {
    const files = fs.readdirSync(LOG_DIR);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    let deleted = 0;

    files.forEach((file) => {
      if (!file.endsWith(".jsonl")) return;

      const dateStr = file.replace(".jsonl", "");
      const fileDate = new Date(dateStr);

      if (fileDate < cutoffDate) {
        fs.unlinkSync(path.join(LOG_DIR, file));
        deleted++;
      }
    });

    return deleted;
  } catch (error) {
    logger.error("[AILogger] Failed to clean old logs:", error);
    return 0;
  }
}

/**
 * Export logs to JSON for analysis
 */
export function exportLogs(startDate: string, endDate: string): AILogEntry[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const logs: AILogEntry[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const dayLogs = readLogs(dateStr);
    logs.push(...dayLogs);
  }

  return logs;
}
