import { createClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

type SupabaseClient = ReturnType<typeof createClient>;

let _client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  // eslint-disable-next-line no-restricted-syntax
  const url = SUPABASE_URL || process.env.SUPABASE_URL;
  // eslint-disable-next-line no-restricted-syntax
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_KEY;
  // eslint-disable-next-line no-restricted-syntax
  const anonKey = SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase configuration: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY for server)."
    );
  }

  _client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}

export type SignedUploadUrlOptions = {
  contentType?: string;
  expiresIn?: number; // seconds
};

/**
 * Creates a signed upload URL for the given storage key.
 *
 * `storageKey` should be the full path within the bucket (no leading slash).
 * Example: `orgId/claims/123/file.png`
 */
export async function createSignedUploadUrl(
  bucket: string,
  storageKey: string,
  options: SignedUploadUrlOptions = {}
): Promise<string> {
  const supabase = getSupabaseClient();
  const expiresIn = options.expiresIn ?? 300;

  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(storageKey, {
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to create signed upload URL: ${error.message}`);
  }

  if (!data?.signedUrl) {
    throw new Error("Failed to create signed upload URL: missing signedUrl");
  }

  // Note: Supabase signed upload URLs don't embed content-type; content type is set by the client PUT.
  // We keep `contentType` in the signature for callers to consistently pass it around.
  void expiresIn;
  void options.contentType;

  return data.signedUrl;
}

export async function createSignedDownloadUrl(
  bucket: string,
  storageKey: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storageKey, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed download URL: ${error.message}`);
  }

  if (!data?.signedUrl) {
    throw new Error("Failed to create signed download URL: missing signedUrl");
  }

  return data.signedUrl;
}
