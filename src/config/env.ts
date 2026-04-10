/* eslint-disable no-restricted-syntax -- This IS the centralized env config layer. All other files must import from here. */
/**
 * Centralized Environment Configuration
 *
 * SINGLE SOURCE OF TRUTH for all environment variables.
 * Provides type-safe access with automatic fallbacks.
 *
 * Usage:
 *   import { env } from '@/config/env';
 *   const apiKey = env.OPENAI_API_KEY;
 */

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value) return value;
  if (fallback !== undefined) return fallback;
  if (process.env.NODE_ENV === "production") {
    console.warn(`[ENV] Missing required env var: ${key}`);
  }
  return "";
}

function getEnvRequired(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[ENV] FATAL: Missing required environment variable: ${key}`);
  }
  return value;
}

function getBool(key: string, defaultValue = false): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1";
}

function getNum(key: string, defaultValue = 0): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Centralized Environment Configuration Object
 */
export const env = {
  // Node Environment
  NODE_ENV: getEnv("NODE_ENV", "development"),
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",
  IS_TEST: process.env.NODE_ENV === "test",

  // App URLs
  NEXT_PUBLIC_APP_URL: getEnv(
    "NEXT_PUBLIC_APP_URL",
    getEnv("NEXT_PUBLIC_SITE_URL", `https://${getEnv("VERCEL_URL", "localhost:3000")}`)
  ),
  NEXT_PUBLIC_SITE_URL: getEnv(
    "NEXT_PUBLIC_SITE_URL",
    `https://${getEnv("VERCEL_URL", "localhost:3000")}`
  ),
  VERCEL_URL: getEnv("VERCEL_URL", "localhost:3000"),

  // Database
  DATABASE_URL: getEnvRequired("DATABASE_URL"),

  // Clerk Auth
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: getEnvRequired("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  CLERK_SECRET_KEY: getEnvRequired("CLERK_SECRET_KEY"),

  // OpenAI
  OPENAI_API_KEY: getEnv("OPENAI_API_KEY"),
  OPENAI_VIDEO_MODEL: getEnv("OPENAI_VIDEO_MODEL", "sora-1.0"),

  // Stripe
  STRIPE_SECRET_KEY: getEnv("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: getEnv("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PRICE_ID: getEnv("STRIPE_PRICE_ID"),
  STRIPE_SOLO_MONTHLY_PRICE_ID: getEnv("STRIPE_SOLO_MONTHLY_PRICE_ID"),
  STRIPE_SOLO_ANNUAL_PRICE_ID: getEnv("STRIPE_SOLO_ANNUAL_PRICE_ID"),
  STRIPE_PRO_ANNUAL_PRICE_ID: getEnv("STRIPE_PRO_ANNUAL_PRICE_ID"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  SUPABASE_ANON_KEY: getEnv("SUPABASE_ANON_KEY"),
  SUPABASE_STORAGE_BUCKET_EXPORTS: getEnv("SUPABASE_STORAGE_BUCKET_EXPORTS", "exports"),

  // S3
  S3_BUCKET: getEnv("S3_BUCKET", "preloss"),

  // Weather APIs
  WEATHERSTACK_API_KEY: getEnv("WEATHERSTACK_API_KEY", getEnv("WEATHER_STACK_API_KEY")),
  VISUALCROSSING_API_KEY: getEnv("VISUALCROSSING_API_KEY", getEnv("VISUAL_CROSSING_API_KEY")),

  // Communication
  RESEND_API_KEY: getEnv("RESEND_API_KEY"),
  EMAIL_FROM: getEnv("EMAIL_FROM", "ClearSkai <noreply@clearskai.com>"),
  TWILIO_ACCOUNT_SID: getEnv("TWILIO_ACCOUNT_SID", getEnv("TWILIO_SID")),
  TWILIO_AUTH_TOKEN: getEnv("TWILIO_AUTH_TOKEN", getEnv("TWILIO_AUTH")),
  TWILIO_PHONE_NUMBER: getEnv("TWILIO_PHONE_NUMBER", getEnv("TWILIO_NUMBER")),

  // Integrations
  QUICKBOOKS_CLIENT_ID: getEnv("QUICKBOOKS_CLIENT_ID"),
  QUICKBOOKS_CLIENT_SECRET: getEnv("QUICKBOOKS_CLIENT_SECRET"),
  QUICKBOOKS_REDIRECT_URI: getEnv("QUICKBOOKS_REDIRECT_URI"),
  QUICKBOOKS_ENVIRONMENT: getEnv("QUICKBOOKS_ENVIRONMENT", "sandbox"),
  ABC_SUPPLY_API_KEY: getEnv("ABC_SUPPLY_API_KEY"),
  ABC_SUPPLY_API_SECRET: getEnv("ABC_SUPPLY_API_SECRET"),
  ABC_SUPPLY_ENVIRONMENT: getEnv("ABC_SUPPLY_ENVIRONMENT", "sandbox"),
  SYNTHESIA_API_KEY: getEnv("SYNTHESIA_API_KEY"),

  // Redis/Upstash
  UPSTASH_REDIS_REST_URL: getEnv("UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: getEnv("UPSTASH_REDIS_REST_TOKEN"),

  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: getEnv("NEXT_PUBLIC_SENTRY_DSN", getEnv("SENTRY_DSN")),
  SENTRY_DSN: getEnv("SENTRY_DSN"),

  // Feature Flags
  NEXT_PUBLIC_MAINTENANCE_MODE: getBool("NEXT_PUBLIC_MAINTENANCE_MODE"),
  NEXT_PUBLIC_AI_TOOLS_ENABLED: getBool("NEXT_PUBLIC_AI_TOOLS_ENABLED", true),
  NEXT_PUBLIC_UPLOADS_ENABLED: getBool("NEXT_PUBLIC_UPLOADS_ENABLED", true),
  NEXT_PUBLIC_SIGNUPS_ENABLED: getBool("NEXT_PUBLIC_SIGNUPS_ENABLED", true),
  NEXT_PUBLIC_BETA_MODE: getBool("NEXT_PUBLIC_BETA_MODE", true),
  NEXT_PUBLIC_ANALYTICS_DISABLED: getBool("NEXT_PUBLIC_ANALYTICS_DISABLED"),
  FREE_BETA: getBool("FREE_BETA"),
  EMERGENCY_MODE: getBool("EMERGENCY_MODE"),
  MAINTENANCE_MODE: getBool("MAINTENANCE_MODE"),

  // Miscellaneous
  TOKEN_ENCRYPTION_KEY: getEnv("TOKEN_ENCRYPTION_KEY"),
  TRADES_WEBHOOK_SECRET: getEnv("TRADES_WEBHOOK_SECRET"),
  EXPORT_URL_TTL_SECONDS: getNum("EXPORT_URL_TTL_SECONDS", 3600),
  LOG_LEVEL: getEnv("LOG_LEVEL", "info"),
  ENABLE_SCHEDULER: getBool("ENABLE_SCHEDULER"),
  BUILD_PHASE: getBool("BUILD_PHASE"),

  // Testing
  TEST_AUTH_BYPASS: getBool("TEST_AUTH_BYPASS"),
  TEST_AUTH_USER_ID: getEnv("TEST_AUTH_USER_ID"),
  TEST_AUTH_ORG_ID: getEnv("TEST_AUTH_ORG_ID"),

  // Vercel
  NEXT_PUBLIC_VERCEL_ENV: getEnv("NEXT_PUBLIC_VERCEL_ENV", getEnv("NODE_ENV", "development")),
  NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: getEnv("NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA"),
  VERCEL: getBool("VERCEL"),
  VERCEL_ENV: getEnv("VERCEL_ENV"),
  VERCEL_REGION: getEnv("VERCEL_REGION"),
  VERCEL_GIT_COMMIT_SHA: getEnv("VERCEL_GIT_COMMIT_SHA"),
  VERCEL_GIT_COMMIT_REF: getEnv("VERCEL_GIT_COMMIT_REF"),
  NEXT_PUBLIC_COMMIT_SHA: getEnv("NEXT_PUBLIC_COMMIT_SHA"),
  NEXT_PUBLIC_BRANCH: getEnv("NEXT_PUBLIC_BRANCH"),

  // Firebase
  FIREBASE_PROJECT_ID: getEnv("FIREBASE_PROJECT_ID"),
  FIREBASE_CLIENT_EMAIL: getEnv("FIREBASE_CLIENT_EMAIL"),
  FIREBASE_PRIVATE_KEY: getEnv("FIREBASE_PRIVATE_KEY"),
  FIREBASE_API_KEY: getEnv("FIREBASE_API_KEY"),
  FIREBASE_AUTH_DOMAIN: getEnv("FIREBASE_AUTH_DOMAIN"),
  FIREBASE_STORAGE_BUCKET: getEnv("FIREBASE_STORAGE_BUCKET"),
  FIREBASE_MESSAGING_SENDER_ID: getEnv("FIREBASE_MESSAGING_SENDER_ID"),
  FIREBASE_APP_ID: getEnv("FIREBASE_APP_ID"),
  FIREBASE_MEASUREMENT_ID: getEnv("FIREBASE_MEASUREMENT_ID"),

  // Mapbox
  MAPBOX_ACCESS_TOKEN: getEnv("MAPBOX_ACCESS_TOKEN"),
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: getEnv("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN"),
  MAPBOX_SECRET_TOKEN: getEnv("MAPBOX_SECRET_TOKEN"),

  // Push Notifications / VAPID
  VAPID_PUBLIC_KEY: getEnv("VAPID_PUBLIC_KEY"),
  VAPID_PRIVATE_KEY: getEnv("VAPID_PRIVATE_KEY"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: getEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),

  // AI Config
  AI_MODEL: getEnv("AI_MODEL", "gpt-4o"),
  ANTHROPIC_API_KEY: getEnv("ANTHROPIC_API_KEY"),
  STABILITY_API_KEY: getEnv("STABILITY_API_KEY"),
  GOOGLE_AI_API_KEY: getEnv("GOOGLE_AI_API_KEY"),
  REPLICATE_API_TOKEN: getEnv("REPLICATE_API_TOKEN"),

  // Weather extended
  TOMORROW_IO_API_KEY: getEnv("TOMORROW_IO_API_KEY"),
  OPENWEATHER_API_KEY: getEnv("OPENWEATHER_API_KEY"),

  // Services
  TRADES_SERVICE_URL: getEnv("TRADES_SERVICE_URL", "http://localhost:4000"),
  NEXT_PUBLIC_PORTAL_URL: getEnv("NEXT_PUBLIC_PORTAL_URL"),
  CRON_SECRET: getEnv("CRON_SECRET"),

  // Email extended
  RESEND_FROM_EMAIL: getEnv("RESEND_FROM_EMAIL", "ClearSkai <noreply@clearskai.com>"),

  // Stripe extended
  STRIPE_PRO_MONTHLY_PRICE_ID: getEnv("STRIPE_PRO_MONTHLY_PRICE_ID"),
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: getEnv("STRIPE_ENTERPRISE_MONTHLY_PRICE_ID"),
  STRIPE_ENTERPRISE_ANNUAL_PRICE_ID: getEnv("STRIPE_ENTERPRISE_ANNUAL_PRICE_ID"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: getEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  STRIPE_CONNECT_CLIENT_ID: getEnv("STRIPE_CONNECT_CLIENT_ID"),

  // Direct DB for migrations/scripts
  DIRECT_DATABASE_URL: getEnv("DIRECT_DATABASE_URL"),

  // Storage extended
  S3_ACCESS_KEY: getEnv("S3_ACCESS_KEY"),
  S3_SECRET_KEY: getEnv("S3_SECRET_KEY"),
  S3_ENDPOINT: getEnv("S3_ENDPOINT"),
  S3_REGION: getEnv("S3_REGION", "us-east-1"),

  // Functions
  NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR: getBool("NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR"),
  NEXT_PUBLIC_MAINTENANCE_MESSAGE: getEnv(
    "NEXT_PUBLIC_MAINTENANCE_MESSAGE",
    "System maintenance in progress. We'll be back shortly."
  ),
} as const;

/**
 * Validate critical environment variables at startup
 */
export function validateEnv(): void {
  const required = ["DATABASE_URL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0 && process.env.NODE_ENV === "production") {
    throw new Error(`[ENV] FATAL: Missing required environment variables: ${missing.join(", ")}`);
  }

  if (missing.length > 0) {
    console.warn(`[ENV] WARNING: Missing environment variables: ${missing.join(", ")}`);
  }
}

// Auto-validate on import in production
if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
  validateEnv();
}
