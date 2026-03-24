import { logger } from "@/lib/logger";

/**
 * Report Export Registry
 * DEPRECATED: reportExport model doesn't exist in schema.
 */

export interface CreateExportParams {
  claimId: string;
  orgId: string;
  type: "report" | "supplement" | "mockup";
  templateId?: string;
  orgTemplateId?: string;
  storagePath: string;
  storageUrl?: string;
  createdBy: string;
  metadata?: Record<string, any>;
}

/**
 * Create export record in database
 */
export async function createExportRecord(params: CreateExportParams) {
  // reportExport model doesn't exist in schema
  logger.debug("[EXPORT_REGISTRY] Record skipped (model not available)", {
    type: params.type,
    claimId: params.claimId,
  });
  return null;
}

/**
 * Get all exports for a claim
 */
export async function getClaimExports(claimId: string, orgId: string) {
  // reportExport model doesn't exist in schema
  logger.debug(`[exportRegistry] Would get exports for claim ${claimId}`);
  return [];
}

/**
 * Get exports by type
 */
export async function getExportsByType(
  claimId: string,
  orgId: string,
  type: "report" | "supplement" | "mockup"
) {
  // reportExport model doesn't exist in schema
  logger.debug(`[exportRegistry] Would get exports by type ${type} for claim ${claimId}`);
  return [];
}
