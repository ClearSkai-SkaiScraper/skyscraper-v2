import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

// Ensure a minimal profile exists for a user. Best-effort; logs on error.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ensureProfile(supabaseClient: any, user: any) {
  try {
    // If caller passes a supabase instance, use it; otherwise use default
    const sb = supabaseClient ?? supabase;
    await sb.from("org_profiles").insert({ id: user.id }).onConflict("id").ignore();
  } catch (error) {
    logger.error("ensureProfile error", error);
  }
}

export { supabase };
