import { logger } from "@/lib/logger";

/**
 * ZIP Builder Stub
 *
 * TODO: Implement ZIP file creation for exports
 * This is a placeholder to allow builds to succeed
 */

export interface ZipEntry {
  name: string;
  content: Buffer | string;
  type?: "file" | "folder";
}

/**
 * Create a ZIP file from entries
 * Stub implementation
 */
export async function createZip(entries: ZipEntry[]): Promise<Buffer> {
  logger.debug(`[ZipBuilder] Stub: Would create ZIP with ${entries.length} entries`);
  // Return empty buffer - actual implementation would use archiver or similar
  return Buffer.from([]);
}

/**
 * Add file to ZIP archive
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function addFileToZip(archive: any, name: string, content: Buffer | string): void {
  logger.debug(`[ZipBuilder] Stub: Would add ${name} to ZIP`);
}

/**
 * Finalize and get ZIP buffer
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function finalizeZip(archive: any): Promise<Buffer> {
  logger.debug("[ZipBuilder] Stub: Would finalize ZIP");
  return Buffer.from([]);
}

/**
 * Build estimate package ZIP
 */
export async function buildEstimateZip(
  claimId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options?: {
    includePhotos?: boolean;
    includeReports?: boolean;
    includePDFs?: boolean;
  }
): Promise<Buffer> {
  logger.debug(`[ZipBuilder] Building estimate ZIP for claim ${claimId}`);
  const entries: ZipEntry[] = [];
  // Stub: would gather files based on options
  return createZip(entries);
}

/**
 * Build claim package ZIP
 */
export async function buildClaimZip(
  claimId: string,
  orgId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options?: {
    includeNarrative?: boolean;
    includeScope?: boolean;
    includePhotos?: boolean;
  }
): Promise<Buffer> {
  logger.debug(`[ZipBuilder] Building claim ZIP for claim ${claimId}, org ${orgId}`);
  const entries: ZipEntry[] = [];
  // Stub: would gather claim files based on options
  return createZip(entries);
}
