/**
 * PDF Upload Utility
 * Handles secure PDF storage with signed URLs
 */

import { logger } from "@/lib/observability/logger";
import { getStorageClient } from "@/lib/storage/client";

export interface UploadPdfOptions {
  buffer: Buffer;
  path: string;
  orgId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function uploadPdf({ buffer, path, orgId }: UploadPdfOptions) {
  try {
    const supabase = getStorageClient();
    if (!supabase) {
      throw new Error("Storage not configured");
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage.from("documents").upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
      cacheControl: "3600",
    });

    if (error) {
      throw new Error(`PDF upload failed: ${error.message}`);
    }

    // Generate signed URL (24 hour expiration)
    const signedUrl = await getSignedUrl(supabase, path);

    return {
      path: data.path,
      url: signedUrl,
      size: buffer.length,
    };
  } catch (error) {
    logger.error("uploadPdf error:", error);
    throw error;
  }
}

export async function getSignedUrl(
  supabaseClient: ReturnType<typeof getStorageClient>,
  path: string,
  expiresIn: number = 86400
): Promise<string> {
  const client = supabaseClient || getStorageClient();
  if (!client) throw new Error("Storage not configured");
  const { data, error } = await client.storage.from("documents").createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

export async function deletePdf(path: string): Promise<void> {
  const supabase = getStorageClient();
  if (!supabase) throw new Error("Storage not configured");
  const { error } = await supabase.storage.from("documents").remove([path]);

  if (error) {
    throw new Error(`PDF deletion failed: ${error.message}`);
  }
}

export async function getPdfMetadata(path: string) {
  const supabase = getStorageClient();
  if (!supabase) throw new Error("Storage not configured");
  const { data, error } = await supabase.storage
    .from("documents")
    .list(path.split("/").slice(0, -1).join("/"), {
      search: path.split("/").pop(),
    });

  if (error) {
    throw new Error(`Failed to get PDF metadata: ${error.message}`);
  }

  return data[0];
}
