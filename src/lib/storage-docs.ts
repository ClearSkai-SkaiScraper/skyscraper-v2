// =====================================================
// DOCUMENT STORAGE UTILITIES
// =====================================================
// Handles Supabase Storage for documents bucket
// Separate from reports bucket for clear RLS/permissions
// =====================================================

import { createClient } from "@supabase/supabase-js";

// Lazy initialization to avoid build-time errors
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    // eslint-disable-next-line no-restricted-syntax
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    // eslint-disable-next-line no-restricted-syntax
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

/**
 * Upload a PDF buffer to documents bucket
 * Path structure: documents/${orgId}/${reportId}-${timestamp}.pdf
 */
export async function uploadToDocumentsBucket(buffer: Buffer, path: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from("documents").upload(path, buffer, {
    contentType: "application/pdf",
    cacheControl: "3600",
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);
}

/**
 * Get signed URL for document (default 7 days expiry)
 * Used for download links, preview, etc.
 */
export async function getDocumentSignedUrl(
  path: string,
  expiresIn = 60 * 60 * 24 * 7 // 7 days
): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, expiresIn);

  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

/**
 * Delete file from documents bucket
 */
export async function deleteFromDocumentsBucket(path: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from("documents").remove([path]);

  if (error) throw new Error(`Delete failed: ${error.message}`);
}

/**
 * Copy file from reports bucket to documents bucket
 * Used when user clicks "Save to My Documents"
 */
export async function copyReportToDocuments(
  reportPath: string,
  documentPath: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const reportsClient = supabase.storage.from("reports");
  const docsClient = supabase.storage.from("documents");

  // Download from reports bucket
  const { data: fileData, error: downloadError } = await reportsClient.download(reportPath);
  if (downloadError) throw new Error(`Download failed: ${downloadError.message}`);

  // Upload to documents bucket
  const buffer = await fileData.arrayBuffer();
  const { error: uploadError } = await docsClient.upload(documentPath, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
}

/**
 * Get public URL for document (no expiry, requires public bucket)
 * Note: Use signed URLs for private documents
 */
export function getDocumentPublicUrl(path: string): string {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from("documents").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * List documents in a folder (for org-level browsing)
 */
export async function listDocumentsInFolder(
  orgId: string,
  folder?: string
): Promise<Array<{ name: string; size: number; updatedAt: string }>> {
  const path = folder ? `documents/${orgId}/${folder}` : `documents/${orgId}`;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from("documents").list(path);

  if (error) throw new Error(`List failed: ${error.message}`);

  return (data || []).map((file) => ({
    name: file.name,
    size: file.metadata?.size || 0,
    updatedAt: file.updated_at || file.created_at,
  }));
}
