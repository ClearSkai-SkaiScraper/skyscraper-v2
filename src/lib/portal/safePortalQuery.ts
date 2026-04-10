import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { logger } from "@/lib/logger";

export type PortalDbIssue = "DB_UNAVAILABLE" | "SCHEMA_OUT_OF_DATE" | "UNKNOWN";
export type PortalDbResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: PortalDbIssue; message: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function classifyPrismaError(error: any): { ok: false; reason: PortalDbIssue; message: string } {
  const message = typeof error?.message === "string" ? error.message : "Unknown error";
  const code = (error as PrismaClientKnownRequestError)?.code;
  const lower = message.toLowerCase();

  if (code === "P1001" || lower.includes("ecconnrefused") || lower.includes("timeout")) {
    return { ok: false, reason: "DB_UNAVAILABLE", message };
  }

  if (code === "P2021" || lower.includes("relation") || lower.includes("does not exist")) {
    return { ok: false, reason: "SCHEMA_OUT_OF_DATE", message };
  }

  return { ok: false, reason: "UNKNOWN", message };
}

export async function safePortalQuery<T>(fn: () => Promise<T>): Promise<PortalDbResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const classification = classifyPrismaError(error);
    logger.error("[PORTAL_DB]", {
      reason: classification.reason,
      message: classification.message,
    });
    return classification;
  }
}
