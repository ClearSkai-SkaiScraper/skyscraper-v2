/**
 * ============================================================================
 * CANONICAL DEMO ORG CONSTANTS
 * ============================================================================
 *
 * NEVER generate random demo org IDs at runtime.
 * ALWAYS use this constant for demo mode.
 *
 * The demo org is created once via ensurePublicDemoOrg() and persists.
 * ============================================================================
 */

/**
 * The ONLY demo org ID that should ever be used.
 * This org is created via ensurePublicDemoOrg() with clerkOrgId='public_demo'.
 *
 * If this org doesn't exist in your DB, run:
 *   pnpm run seed:minimal-demo
 * or call ensurePublicDemoOrg() once.
 */
export const PUBLIC_DEMO_ORG_ID = "7dfd4537-ad63-4b32-b34f-6462061f0c6c";
export const PUBLIC_DEMO_CLERK_ORG_ID = "public_demo";

/**
 * Environment variable overrides (for legacy support).
 * Falls back to the canonical PUBLIC_DEMO_ORG_ID.
 */
export function getDemoOrgId(): string {
  // eslint-disable-next-line no-restricted-syntax
  return process.env.DEMO_ORG_ID || process.env.BETA_DEMO_ORG_ID || PUBLIC_DEMO_ORG_ID;
}

/**
 * Check if an orgId is the public demo org.
 */
export function isPublicDemoOrg(orgId: string | null | undefined): boolean {
  if (!orgId) return false;
  const demoId = getDemoOrgId();
  return orgId === demoId || orgId === PUBLIC_DEMO_ORG_ID;
}
