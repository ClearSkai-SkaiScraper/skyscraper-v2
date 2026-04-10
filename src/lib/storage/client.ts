/**
 * 🗄️ STORAGE CLIENT SINGLETON
 *
 * Centralized Supabase Storage client with:
 * - Lazy initialization (no build-time errors)
 * - Graceful degradation (returns null if not configured)
 * - Single source of truth
 * - Easy to swap backend later (S3, R2, Cloudflare, etc.)
 *
 * Usage:
 *   const storage = getStorageClient();
 *   if (!storage) return { error: "Storage not configured" };
 *
 *   const { data, error } = await storage.upload('bucket', 'file.pdf', buffer);
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/observability/logger";

let _client: SupabaseClient | null = null;

/**
 * Returns the Supabase storage client singleton.
 * Creates it lazily on first call — no cold-start penalty.
 *
 * @returns SupabaseClient or null if not configured
 */
export function getStorageClient(): SupabaseClient | null {
  if (_client) return _client;

  // eslint-disable-next-line no-restricted-syntax
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // eslint-disable-next-line no-restricted-syntax
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build or when env vars missing, return null
  if (!url || !key) {
    // eslint-disable-next-line no-restricted-syntax
    if (process.env.NODE_ENV === "development") {
      logger.warn("[Storage] Supabase not configured - storage features disabled");
    }
    return null;
  }

  try {
    _client = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    return _client;
  } catch (error) {
    logger.error("[Storage] Failed to initialize Supabase client:", error);
    return null;
  }
}

/**
 * Helper: Upload file to storage bucket
 *
 * @param bucket - Bucket name (e.g., 'uploads', 'exports')
 * @param path - File path within bucket
 * @param file - File buffer or Blob
 * @param options - Upload options (contentType, upsert, etc.)
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer | Blob | File,
  options?: {
    contentType?: string;
    upsert?: boolean;
    cacheControl?: string;
  }
) {
  const client = getStorageClient();
  if (!client) {
    return { data: null, error: new Error("Storage not configured") };
  }

  return await client.storage.from(bucket).upload(path, file, {
    contentType: options?.contentType,
    upsert: options?.upsert ?? false,
    cacheControl: options?.cacheControl,
  });
}

/**
 * Helper: Get signed URL for private file
 *
 * @param bucket - Bucket name
 * @param path - File path within bucket
 * @param expiresIn - Expiration in seconds (default: 1 hour)
 */
export async function getSignedUrl(bucket: string, path: string, expiresIn: number = 3600) {
  const client = getStorageClient();
  if (!client) {
    return { data: null, error: new Error("Storage not configured") };
  }

  return await client.storage.from(bucket).createSignedUrl(path, expiresIn);
}

/**
 * Helper: Delete file from storage
 *
 * @param bucket - Bucket name
 * @param paths - File path(s) to delete
 */
export async function deleteFile(bucket: string, paths: string | string[]) {
  const client = getStorageClient();
  if (!client) {
    return { data: null, error: new Error("Storage not configured") };
  }

  const pathArray = Array.isArray(paths) ? paths : [paths];
  return await client.storage.from(bucket).remove(pathArray);
}

/**
 * Helper: List files in a bucket path
 *
 * @param bucket - Bucket name
 * @param path - Folder path (optional)
 */
export async function listFiles(bucket: string, path?: string) {
  const client = getStorageClient();
  if (!client) {
    return { data: null, error: new Error("Storage not configured") };
  }

  return await client.storage.from(bucket).list(path);
}

/**
 * Helper: Get public URL for a file
 * @deprecated Use getSignedUrl() instead — public URLs bypass auth (F-02)
 *
 * @param bucket - Bucket name
 * @param path - File path within bucket
 */
export function getPublicUrl(bucket: string, path: string) {
  const client = getStorageClient();
  if (!client) {
    return { data: { publicUrl: "" } };
  }

  return client.storage.from(bucket).getPublicUrl(path);
}

/**
 * F-02: Get multiple signed URLs in batch.
 *
 * @param bucket - Bucket name
 * @param paths - Array of file paths
 * @param expiresIn - Expiration in seconds (default 3600)
 * @returns Array of { path, signedUrl } objects
 */
export async function getSignedUrls(
  bucket: string,
  paths: string[],
  expiresIn: number = 3600
): Promise<Array<{ path: string; signedUrl: string | null }>> {
  const client = getStorageClient();
  if (!client) return paths.map((p) => ({ path: p, signedUrl: null }));

  const { data, error } = await client.storage.from(bucket).createSignedUrls(paths, expiresIn);

  if (error) {
    logger.error(
      `[Storage] Batch signed URL creation failed for bucket=${bucket}: ${error.message}`
    );
    return paths.map((p) => ({ path: p, signedUrl: null }));
  }

  return (data ?? []).map((d) => ({
    path: d.path ?? "",
    signedUrl: d.signedUrl ?? null,
  }));
}
