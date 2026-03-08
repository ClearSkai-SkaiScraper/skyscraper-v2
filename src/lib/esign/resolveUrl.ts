/**
 * Resolve e-sign storage URLs
 *
 * Handles both legacy filesystem paths (/esign/...) and
 * new Supabase storage keys (supabase://bucket/key)
 */

import { logger } from "@/lib/logger";
import { createSignedDownloadUrl } from "@/lib/supabaseStorage";

/**
 * Resolve a stored e-sign URL to a downloadable URL.
 *
 * Supports:
 * - `supabase://bucket/key` → signed download URL (1 hour expiry)
 * - `/esign/...` → legacy filesystem path (returned as-is for backwards compat)
 * - `null/undefined` → returns null
 */
export async function resolveEsignUrl(
  storedUrl: string | null | undefined
): Promise<string | null> {
  if (!storedUrl) return null;

  // New Supabase storage format: supabase://bucket/path
  if (storedUrl.startsWith("supabase://")) {
    try {
      const withoutScheme = storedUrl.replace("supabase://", "");
      const slashIndex = withoutScheme.indexOf("/");
      if (slashIndex === -1) return null;

      const bucket = withoutScheme.substring(0, slashIndex);
      const key = withoutScheme.substring(slashIndex + 1);

      return await createSignedDownloadUrl(bucket, key, 3600);
    } catch (error) {
      logger.error("[ESIGN_RESOLVE_URL]", { storedUrl, error });
      return null;
    }
  }

  // Legacy filesystem path — return as-is
  return storedUrl;
}
