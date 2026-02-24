// Lightweight server helper returning the guarded Supabase client (anon key)
// and, when needed, a privileged service-role client strictly on the server.
import { createClient as supabaseCreateClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Returns the standard anon-key client (same singleton used by client code).
export async function getAnonClient() {
  return supabase;
}

// Creates a service role client for server-only operations (e.g. administrative
// batch jobs, migrations, privileged RLS bypass tasks). Never expose this to
// the browser; attempting to call this in a client context throws.
export function getServiceRoleClient() {
  if (typeof window !== "undefined") {
    throw new Error("getServiceRoleClient() cannot be invoked in the browser");
  }
  // eslint-disable-next-line no-restricted-syntax
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  // eslint-disable-next-line no-restricted-syntax
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !/^https?:\/\//.test(url)) {
    throw new Error("Missing or invalid SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!key || /\s/.test(key)) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (server env)");
  }
  return supabaseCreateClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type SupabaseServerClient = Awaited<ReturnType<typeof getAnonClient>>;
export type SupabaseServiceRoleClient = ReturnType<typeof getServiceRoleClient>;
