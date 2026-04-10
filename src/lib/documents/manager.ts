import { q, qExec, qOne } from "@/lib/db";

/**
 * Document types in the canonical system
 */
export type DocumentType = "PROPOSAL" | "PACKET" | "CLAIM_MASTER" | "SUPPLEMENT" | "REBUTTAL";

/**
 * Document status lifecycle
 */
export type DocumentStatus = "queued" | "generating" | "ready" | "signed" | "error";

type NextVersionRow = { next_version: number };
type InsertedIdRow = { id: string };

export type GeneratedDocumentHistoryRow = {
  id: string;
  type: DocumentType;
  version: number;
  document_name: string;
  description: string | null;
  status: DocumentStatus;
  file_url: string | null;
  file_format: string | null;
  file_size_bytes: number | null;
  sections: string[] | null;
  tokens_used: number | null;
  estimated_cost_cents: number | null;
  signed_at: Date | null;
  signed_by: string | null;
  is_immutable: boolean;
  error_message: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
};

/**
 * Create a new canonical document record
 */
export async function createGeneratedDocument(params: {
  organizationId: string;
  type: DocumentType;
  documentName: string;
  createdBy: string;
  claimId?: string;
  proposalId?: string;
  templateId?: string;
  description?: string;
  sections?: string[];
  fileFormat?: string;
}): Promise<string> {
  const {
    organizationId,
    type,
    documentName,
    createdBy,
    claimId,
    proposalId,
    templateId,
    description,
    sections = [],
    fileFormat = "pdf",
  } = params;

  // Get next version number for this document type + parent
  const versionQuery = claimId
    ? `SELECT COALESCE(MAX(version), 0) + 1 as next_version 
       FROM generated_documents 
       WHERE claim_id = $1 AND type = $2`
    : proposalId
      ? `SELECT COALESCE(MAX(version), 0) + 1 as next_version 
       FROM generated_documents 
       WHERE proposal_id = $1 AND type = $2`
      : null;

  let version = 1;
  if (versionQuery) {
    const nextVersion = await qOne<NextVersionRow>(versionQuery, [claimId || proposalId, type]);
    version = nextVersion?.next_version || 1;
  }

  // Create document record
  const inserted = await qOne<InsertedIdRow>(
    `
    INSERT INTO generated_documents (
      organization_id,
      type,
      version,
      claim_id,
      proposal_id,
      template_id,
      document_name,
      description,
      sections,
      file_format,
      status,
      created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    )
    RETURNING id
    `,
    [
      organizationId,
      type,
      version,
      claimId || null,
      proposalId || null,
      templateId || null,
      documentName,
      description || null,
      sections,
      fileFormat,
      "queued",
      createdBy,
    ]
  );

  if (!inserted?.id) {
    throw new Error("Failed to create generated document");
  }

  return inserted.id;
}

/**
 * Update document status
 */
export async function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  updates?: {
    fileUrl?: string;
    fileSizeBytes?: number;
    checksum?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generatedContent?: any;
    tokensUsed?: number;
    estimatedCostCents?: number;
    errorMessage?: string;
  }
): Promise<void> {
  const fields: string[] = ["status = $2", "updated_at = NOW()"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any[] = [documentId, status];
  let paramIndex = 3;

  if (updates?.fileUrl) {
    fields.push(`file_url = $${paramIndex++}`);
    values.push(updates.fileUrl);
  }

  if (updates?.fileSizeBytes) {
    fields.push(`file_size_bytes = $${paramIndex++}`);
    values.push(updates.fileSizeBytes);
  }

  if (updates?.checksum) {
    fields.push(`checksum = $${paramIndex++}`);
    values.push(updates.checksum);
  }

  if (updates?.generatedContent) {
    fields.push(`generated_content = $${paramIndex++}`);
    values.push(JSON.stringify(updates.generatedContent));
  }

  if (updates?.tokensUsed) {
    fields.push(`tokens_used = $${paramIndex++}`);
    values.push(updates.tokensUsed);
  }

  if (updates?.estimatedCostCents) {
    fields.push(`estimated_cost_cents = $${paramIndex++}`);
    values.push(updates.estimatedCostCents);
  }

  if (updates?.errorMessage) {
    fields.push(`error_message = $${paramIndex++}`);
    values.push(updates.errorMessage);
  }

  await qExec(`UPDATE generated_documents SET ${fields.join(", ")} WHERE id = $1`, values);
}

/**
 * Sign a document (makes it immutable)
 */
export async function signDocument(
  documentId: string,
  signedBy: string,
  signatureHash: string
): Promise<void> {
  await qExec(
    `
    UPDATE generated_documents 
    SET 
      status = 'signed',
      signed_at = NOW(),
      signed_by = $2,
      signature_hash = $3,
      is_immutable = TRUE,
      updated_at = NOW()
    WHERE id = $1 AND status = 'ready'
    `,
    [documentId, signedBy, signatureHash]
  );
}

/**
 * Get document history for a claim or proposal
 */
export async function getDocumentHistory(params: {
  organizationId: string;
  claimId?: string;
  proposalId?: string;
  type?: DocumentType;
}): Promise<GeneratedDocumentHistoryRow[]> {
  const { organizationId, claimId, proposalId, type } = params;

  const whereConditions: string[] = ["organization_id = $1"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any[] = [organizationId];
  let paramIndex = 2;

  if (claimId) {
    whereConditions.push(`claim_id = $${paramIndex++}`);
    values.push(claimId);
  }

  if (proposalId) {
    whereConditions.push(`proposal_id = $${paramIndex++}`);
    values.push(proposalId);
  }

  if (type) {
    whereConditions.push(`type = $${paramIndex++}`);
    values.push(type);
  }

  const documents = await q<GeneratedDocumentHistoryRow>(
    `
    SELECT 
      id,
      type,
      version,
      document_name,
      description,
      status,
      file_url,
      file_format,
      file_size_bytes,
      sections,
      tokens_used,
      estimated_cost_cents,
      signed_at,
      signed_by,
      is_immutable,
      error_message,
      created_by,
      created_at,
      updated_at
    FROM generated_documents
    WHERE ${whereConditions.join(" AND ")}
    ORDER BY created_at DESC, version DESC
    `,
    values
  );

  return documents;
}

/**
 * Get latest version of a document type
 */
export async function getLatestDocumentVersion(params: {
  organizationId: string;
  type: DocumentType;
  claimId?: string;
  proposalId?: string;
}): Promise<GeneratedDocumentHistoryRow | null> {
  const { organizationId, type, claimId, proposalId } = params;

  const whereConditions: string[] = ["organization_id = $1", "type = $2", "status != 'error'"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any[] = [organizationId, type];
  let paramIndex = 3;

  if (claimId) {
    whereConditions.push(`claim_id = $${paramIndex++}`);
    values.push(claimId);
  }

  if (proposalId) {
    whereConditions.push(`proposal_id = $${paramIndex++}`);
    values.push(proposalId);
  }

  const result = await qOne<GeneratedDocumentHistoryRow>(
    `
    SELECT *
    FROM generated_documents
    WHERE ${whereConditions.join(" AND ")}
    ORDER BY version DESC
    LIMIT 1
    `,
    values
  );

  return result;
}
