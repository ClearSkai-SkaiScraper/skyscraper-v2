import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Security utility for server actions
 * Provides authorization guards, null safety, and error handling
 */

// NOTE: requireAuth has been consolidated to @/lib/auth/requireAuth
// Import from there instead: import { requireAuth } from "@/lib/auth/requireAuth";

/**
 * Verify user has access to a specific claim
 * @param claimId - Claim ID to check
 * @param userId - User ID to verify
 * @param orgId - Organization ID to verify
 * @returns boolean indicating if user has access
 */
export async function verifyClaimAccess(
  claimId: string,
  userId: string,
  orgId: string | null
): Promise<boolean> {
  try {
    if (!orgId) return false;

    const claim = await prisma.claims.findFirst({
      where: {
        id: claimId,
        orgId: orgId,
      },
      select: { id: true },
    });

    return !!claim;
  } catch (error) {
    logger.error("[verifyClaimAccess] Verification failed:", error);
    return false;
  }
}

/**
 * Verify user has access to a specific report
 * @param reportId - Report ID to check
 * @param orgId - Organization ID to verify
 * @returns boolean indicating if user has access
 */
export async function verifyReportAccess(reportId: string, orgId: string | null): Promise<boolean> {
  try {
    if (!orgId) return false;

    const report = await prisma.ai_reports.findFirst({
      where: {
        id: reportId,
        orgId: orgId,
      },
      select: { id: true },
    });

    return !!report;
  } catch (error) {
    logger.error("[verifyReportAccess] Verification failed:", error);
    return false;
  }
}

/**
 * Safe data wrapper for server actions
 * Handles errors and returns standardized response
 */
export interface ServerActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Wrap server action with error handling
 * @param action - Async function to execute
 * @returns ServerActionResult with success/error status
 */
export async function safeServerAction<T>(
  action: () => Promise<T>
): Promise<ServerActionResult<T>> {
  try {
    const data = await action();
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("[SAFE_SERVER_ACTION] Error", { message });
    return { success: false, error: message };
  }
}

/**
 * Validate required fields are present
 * @param data - Object to validate
 * @param requiredFields - Array of required field names
 * @throws Error if any required field is missing
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateRequiredFields(data: Record<string, any>, requiredFields: string[]): void {
  const missingFields = requiredFields.filter((field) => !data[field]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  }
}

/**
 * Sanitize string input to prevent injection attacks
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return "";

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove HTML tags
    .slice(0, 10000); // Limit length
}

/**
 * Check if user has permission for action
 * @param userId - User ID
 * @param action - Action name (e.g., "create:claim", "delete:report")
 * @returns boolean indicating if user has permission
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function checkPermission(userId: string, action: string): Promise<boolean> {
  try {
    // TODO: Implement role-based permissions
    // For now, all authenticated users have basic permissions
    return true;
  } catch (error) {
    logger.error("[checkPermission] Permission check failed:", error);
    return false;
  }
}
