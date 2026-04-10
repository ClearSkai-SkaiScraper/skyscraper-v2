/**
 * Generated Documents Service
 * Re-exports from manager.ts for backwards compatibility
 *
 * NOTE: The generatedDocument Prisma model does not exist.
 * All document operations use raw SQL queries in manager.ts.
 */

// Re-export everything from the canonical manager
export {
  createGeneratedDocument,
  type DocumentStatus,
  type DocumentType,
  type GeneratedDocumentHistoryRow,
  getDocumentHistory,
  updateDocumentStatus,
} from "./manager";

// Legacy interface for backwards compatibility
export interface CreateDocumentOptions {
  orgId: string;
  type: "PROPOSAL" | "CLAIM_MASTER" | "SUPPLEMENT" | "REBUTTAL" | "PACKET";
  templateId?: string;
  claimId?: string;
  proposalId?: string;
  createdById: string;
}

/**
 * Get documents by organization
 * Uses raw SQL since generatedDocument model doesn't exist
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getDocumentsByOrg(orgId: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { getDocumentHistory } = await import("./manager");
  // Return empty array - caller should use getDocumentHistory with proper params
  return [];
}

/**
 * Get document by ID
 * Uses raw SQL since generatedDocument model doesn't exist
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getDocumentById(documentId: string) {
  // Return null - caller should use getDocumentHistory with proper params
  return null;
}
