/**
 * Storage Upload Helpers (Server-Side)
 * 
 * Server-side utilities for uploading files to Supabase Storage.
 * Used by worker processes and API routes.
 * 
 * For client-side uploads, see: src/lib/storage.ts
 */

import { createClient } from "@supabase/supabase-js";

// =============================================================================
// CLIENT INITIALIZATION
// =============================================================================

let supabaseServerClient: ReturnType<typeof createClient> | null = null;

function getSupabaseServerClient() {
  if (!supabaseServerClient) {
    // eslint-disable-next-line no-restricted-syntax
    const url = process.env.SUPABASE_URL;
    // eslint-disable-next-line no-restricted-syntax
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required"
      );
    }

    supabaseServerClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return supabaseServerClient;
}

// =============================================================================
// BUCKET CONSTANTS
// =============================================================================

export const SERVER_BUCKETS = {
  PROPOSALS: "proposals",
  PHOTOS: "proposal-photos"
} as const;

// =============================================================================
// UPLOAD FUNCTIONS
// =============================================================================

export interface ServerUploadOptions {
  /** File name (will be prefixed with org_id/uuid) */
  fileName: string;
  /** File data (Buffer or Blob) */
  fileData: Buffer | Blob | ArrayBuffer;
  /** MIME type (e.g. "image/jpeg", "application/pdf") */
  contentType: string;
  /** Organization ID (for path namespacing) */
  orgId: string;
  /** Optional metadata */
  metadata?: Record<string, string>;
}

export interface ServerUploadResult {
  /** Full path in bucket */
  path: string;
  /** Public URL (if bucket is public) or signed URL */
  url: string;
  /** Bucket name */
  bucket: string;
}

/**
 * Upload a file to Supabase Storage (server-side with service role)
 * 
 * Path structure: {orgId}/{timestamp}-{uuid}-{fileName}
 * 
 * @param bucket - Bucket name (use SERVER_BUCKETS constant)
 * @param options - Upload options
 * @returns Upload result with path and URL
 * @throws Error if upload fails
 */
export async function uploadFileServer(
  bucket: string,
  options: ServerUploadOptions
): Promise<ServerUploadResult> {
  const { fileName, fileData, contentType, orgId, metadata } = options;

  const supabase = getSupabaseServerClient();

  // Generate unique path: orgId/timestamp-uuid-filename
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  const path = `${orgId}/${timestamp}-${uuid}-${fileName}`;

  // Convert data to Buffer if needed
  let buffer: Buffer;
  if (Buffer.isBuffer(fileData)) {
    buffer = fileData;
  } else if (fileData instanceof ArrayBuffer) {
    buffer = Buffer.from(fileData);
  } else {
    // Blob
    const arrayBuffer = await (fileData as Blob).arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  // Upload to storage
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert: false,
      metadata
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return {
    path,
    url: urlData.publicUrl,
    bucket
  };
}

/**
 * Upload a photo for proposal damage analysis
 * 
 * @param orgId - Organization ID
 * @param photoData - Photo buffer or blob
 * @param contentType - Image MIME type
 * @returns Upload result
 */
export async function uploadProposalPhoto(
  orgId: string,
  photoData: Buffer | Blob | ArrayBuffer,
  contentType: string
): Promise<ServerUploadResult> {
  // Extract file extension from content type
  const extension = contentType.split("/")[1] || "jpg";
  const fileName = `photo.${extension}`;

  return uploadFileServer(SERVER_BUCKETS.PHOTOS, {
    fileName,
    fileData: photoData,
    contentType,
    orgId,
    metadata: {
      uploadedAt: new Date().toISOString()
    }
  });
}

/**
 * Upload a generated proposal PDF
 * 
 * @param orgId - Organization ID
 * @param proposalId - Proposal UUID
 * @param pdfData - PDF buffer
 * @returns Upload result
 */
export async function uploadProposalPDF(
  orgId: string,
  proposalId: string,
  pdfData: Buffer
): Promise<ServerUploadResult> {
  return uploadFileServer(SERVER_BUCKETS.PROPOSALS, {
    fileName: `proposal-${proposalId}.pdf`,
    fileData: pdfData,
    contentType: "application/pdf",
    orgId,
    metadata: {
      proposalId,
      generatedAt: new Date().toISOString()
    }
  });
}

// =============================================================================
// SIGNED URL FUNCTIONS
// =============================================================================

/**
 * Generate a signed URL for temporary access
 * 
 * @param bucket - Bucket name
 * @param path - File path in bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function createSignedUrlServer(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Generate a signed upload URL for client-side uploads
 * 
 * @param bucket - Bucket name
 * @param orgId - Organization ID
 * @param fileName - Desired file name
 * @param expiresIn - Expiration time in seconds (default: 5 minutes)
 * @returns Signed upload URL and path
 */
export async function createSignedUploadUrlServer(
  bucket: string,
  orgId: string,
  fileName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  expiresIn: number = 300
): Promise<{ signedUrl: string; path: string }> {
  const supabase = getSupabaseServerClient();

  // Generate unique path
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  const path = `${orgId}/${timestamp}-${uuid}-${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path, {
      upsert: false
    });

  if (error) {
    throw new Error(`Failed to create signed upload URL: ${error.message}`);
  }

  return {
    signedUrl: data.signedUrl,
    path
  };
}

// =============================================================================
// DELETE FUNCTIONS
// =============================================================================

/**
 * Delete a file from storage
 * 
 * @param bucket - Bucket name
 * @param path - File path to delete
 */
export async function deleteFileServer(bucket: string, path: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Delete all files in a folder
 * 
 * @param bucket - Bucket name
 * @param prefix - Folder prefix (e.g. "orgId/")
 */
export async function deleteFolderServer(bucket: string, prefix: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  // List all files in folder
  const { data: files, error: listError } = await supabase.storage
    .from(bucket)
    .list(prefix);

  if (listError) {
    throw new Error(`Failed to list files: ${listError.message}`);
  }

  if (!files || files.length === 0) {
    return; // Nothing to delete
  }

  // Delete all files
  const paths = files.map(f => `${prefix}/${f.name}`);
  const { error: deleteError } = await supabase.storage.from(bucket).remove(paths);

  if (deleteError) {
    throw new Error(`Failed to delete folder: ${deleteError.message}`);
  }
}
