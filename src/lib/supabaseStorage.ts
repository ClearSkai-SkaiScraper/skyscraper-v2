/**
 * Supabase Storage utility — signed download URL helper
 *
 * Stub: Once Supabase storage is configured, replace with real implementation.
 */

import { logger } from "@/lib/logger";

/**
 * Create a signed download URL for a Supabase Storage object.
 *
 * @param bucket - The storage bucket name
 * @param key    - The object key / path within the bucket
 * @param expiresIn - Expiry time in seconds (default 3600 = 1 hour)
 * @returns The signed URL string, or null if unavailable
 */
export async function createSignedDownloadUrl(
  bucket: string,
  key: string,
  expiresIn = 3600
): Promise<string | null> {
  try {
    // TODO: Replace with real Supabase storage client once configured
    // const { data, error } = await supabase.storage
    //   .from(bucket)
    //   .createSignedUrl(key, expiresIn);
    // if (error) throw error;
    // return data.signedUrl;

    logger.warn("[SUPABASE_STORAGE] Stub — returning public URL fallback", { bucket, key });
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL || ""}/storage/v1/object/public/${bucket}/${key}`;
  } catch (error) {
    logger.error("[SUPABASE_STORAGE] createSignedDownloadUrl failed", { bucket, key, error });
    return null;
  }
}
