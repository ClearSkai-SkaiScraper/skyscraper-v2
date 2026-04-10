import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with Clerk JWT for server-side use
 * This enables RLS policies to work with Clerk authentication
 *
 * Usage in API routes:
 * ```ts
 * import { createSupabaseServerClient } from "@/lib/supabase-server";
 *
 * export async function GET() {
 *   const supabase = await createSupabaseServerClient();
 *   const { data } = await supabase.from('trades_posts').select('*');
 * }
 * ```
 */
export async function createSupabaseServerClient() {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId, getToken } = await auth();

  if (!userId) {
    throw new Error("Unauthorized: No Clerk user found");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  // Get Clerk session token to pass to Supabase
  const token = await getToken({ template: "supabase" });

  // Create Supabase client with Clerk JWT
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
    },
  });

  return { supabase, userId };
}

/**
 * Creates a Supabase admin client with service role key
 * Bypasses RLS - use with caution!
 *
 * Usage:
 * ```ts
 * import { createSupabaseAdminClient } from "@/lib/supabase-server";
 *
 * export async function POST() {
 *   const supabase = createSupabaseAdminClient();
 *   // Admin operations here
 * }
 * ```
 */
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Creates a Supabase server client for template asset generation
 * Uses service role key for server-side operations
 */
export function supabaseServer() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVER_ENV_MISSING");
  return createClient(url, key, { auth: { persistSession: false } });
}
