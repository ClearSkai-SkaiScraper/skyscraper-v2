/**
 * Storage Path Utilities for E-Signature System
 *
 * Defines standardized storage structure for all e-sign documents
 */

export interface StorageConfig {
  companyDocsPath: (orgId: string, templateId: string) => string;
  signaturePath: (envelopeId: string, signerId: string, fieldId: string) => string;
  finalizedPdfPath: (claimId: string, envelopeId: string) => string;
  tempUploadPath: (filename: string) => string;
}

/**
 * Storage path configuration — Supabase Storage compatible keys (no leading slash)
 *
 * Structure:
 * - company-docs/{orgId}/{templateId}.pdf         (original templates)
 * - esign/{envelopeId}/signatures/{signerId}-{fieldId}.png  (signature images)
 * - claim-documents/{claimId}/signed/{envelopeId}.pdf  (finalized signed PDFs)
 * - temp/{uuid}.pdf  (temporary uploads before processing)
 */
export const storagePaths: StorageConfig = {
  /**
   * Company document template storage
   * Example: company-docs/org_abc123/tpl_def456.pdf
   */
  companyDocsPath: (orgId: string, templateId: string) => `company-docs/${orgId}/${templateId}.pdf`,

  /**
   * Individual signature image storage (transparent PNG)
   * Example: esign/env_xyz789/signatures/signer_001-field_002.png
   */
  signaturePath: (envelopeId: string, signerId: string, fieldId: string) =>
    `esign/${envelopeId}/signatures/${signerId}-${fieldId}.png`,

  /**
   * Finalized signed PDF storage
   * Example: claim-documents/clm_abc123/signed/env_xyz789.pdf
   */
  finalizedPdfPath: (claimId: string, envelopeId: string) =>
    `claim-documents/${claimId}/signed/${envelopeId}.pdf`,

  /**
   * Temporary upload storage (before moving to permanent location)
   * Example: temp/550e8400-e29b-41d4-a716-446655440000.pdf
   */
  tempUploadPath: (filename: string) => `temp/${filename}`,
};

/**
 * Extract file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * Validate PDF file
 */
export function isPdfFile(filename: string): boolean {
  return getFileExtension(filename) === "pdf";
}

/**
 * Validate PNG file (for signatures)
 */
export function isPngFile(filename: string): boolean {
  return getFileExtension(filename) === "png";
}

/**
 * Generate safe filename (remove special characters)
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .toLowerCase();
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
  };
  return mimeTypes[ext] || "application/octet-stream";
}
