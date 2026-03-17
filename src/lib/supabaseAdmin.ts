import { createClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";

// Lazy admin client accessor to avoid import-time crashes when env vars
// are absent (e.g., during static build or local partial configuration).
let _admin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    logger.warn("[supabaseAdmin] Service role not configured – returning null");
    return null;
  }
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}

// Backward compatibility: legacy named export expected elsewhere.
export const supabaseAdmin = getSupabaseAdmin();
