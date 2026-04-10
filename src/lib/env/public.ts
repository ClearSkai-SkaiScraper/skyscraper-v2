/**
 * Public Environment Variable Helper
 *
 * Centralizes public env access with NEXT_PUBLIC_* as primary
 * and VITE_* as legacy fallback for backward compatibility.
 *
 * Usage:
 *   import { getPublicEnv, env } from "@/lib/env/public";
 *
 *   // Direct access with fallback
 *   const url = getPublicEnv("NEXT_PUBLIC_SUPABASE_URL", ["VITE_SUPABASE_URL"]);
 *
 *   // Pre-mapped common vars
 *   const { supabaseUrl, supabaseAnonKey } = env;
 */

/**
 * Get a public environment variable with optional fallbacks
 * @param name Primary env var name (should be NEXT_PUBLIC_*)
 * @param fallbacks Array of fallback var names (legacy VITE_* etc)
 * @returns The value or undefined
 */
export function getPublicEnv(name: string, fallbacks: string[] = []): string | undefined {
  // eslint-disable-next-line no-restricted-syntax
  const value = process.env[name];
  if (value) return value;

  for (const fallback of fallbacks) {
    // eslint-disable-next-line no-restricted-syntax
    const fallbackValue = process.env[fallback];
    if (fallbackValue) return fallbackValue;
  }

  return undefined;
}

/**
 * Get a required public environment variable (throws if missing)
 */
export function requirePublicEnv(name: string, fallbacks: string[] = []): string {
  const value = getPublicEnv(name, fallbacks);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Pre-mapped common public environment variables
 * All use NEXT_PUBLIC_* as primary with VITE_* fallback
 */
export const env = {
  // Supabase
  supabaseUrl: getPublicEnv("NEXT_PUBLIC_SUPABASE_URL", ["VITE_SUPABASE_URL"]),
  supabaseAnonKey: getPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", [
    "VITE_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ]),

  // Clerk
  clerkPublishableKey: getPublicEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", [
    "VITE_CLERK_PUBLISHABLE_KEY",
  ]),

  // Mapbox
  mapboxToken: getPublicEnv("NEXT_PUBLIC_MAPBOX_TOKEN", ["VITE_MAPBOX_TOKEN"]),

  // Google
  googleClientId: getPublicEnv("NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID", ["VITE_GOOGLE_WEB_CLIENT_ID"]),

  // App config
  baseUrl: getPublicEnv("NEXT_PUBLIC_BASE_URL", ["VITE_BASE_URL"]),
  apiBaseUrl: getPublicEnv("NEXT_PUBLIC_API_BASE_URL", ["VITE_API_BASE_URL"]),
  appVersion: getPublicEnv("NEXT_PUBLIC_APP_VERSION", ["VITE_APP_VERSION"]),

  // Feature flags
  inviteOnly: getPublicEnv("NEXT_PUBLIC_INVITE_ONLY") === "true",
  statusEnabled: getPublicEnv("NEXT_PUBLIC_STATUS_ENABLED", ["VITE_STATUS_ENABLED"]) === "true",
  announceEnabled:
    getPublicEnv("NEXT_PUBLIC_ANNOUNCE_ENABLED", ["VITE_ANNOUNCE_ENABLED"]) === "true",
  announceText: getPublicEnv("NEXT_PUBLIC_ANNOUNCE_TEXT", ["VITE_ANNOUNCE_TEXT"]),
};

/**
 * Check which env vars are present (for diagnostics)
 */
export function getEnvStatus() {
  return {
    supabase: {
      url: !!env.supabaseUrl,
      anonKey: !!env.supabaseAnonKey,
    },
    clerk: {
      publishableKey: !!env.clerkPublishableKey,
    },
    mapbox: {
      token: !!env.mapboxToken,
    },
    google: {
      clientId: !!env.googleClientId,
    },
  };
}
