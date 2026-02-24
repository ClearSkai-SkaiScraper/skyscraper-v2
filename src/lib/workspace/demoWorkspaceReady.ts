/**
 * Emergency Demo Workspace Utility
 *
 * Demo mode is controlled entirely by environment variables:
 * - EMERGENCY_DEMO_MODE           (server-side)
 * - NEXT_PUBLIC_EMERGENCY_DEMO_MODE (client-side)
 *
 * When both are false, demo mode is OFF.
 */

/* eslint-disable no-restricted-syntax */
const DEMO_MODE =
  process.env.EMERGENCY_DEMO_MODE === "true" ||
  process.env.NEXT_PUBLIC_EMERGENCY_DEMO_MODE === "true";
/* eslint-enable no-restricted-syntax */

type WorkspaceReadyOptions = {
  hasOrganization: boolean;
  hasBranding?: boolean;
};

export function isDemoWorkspaceReady(opts: WorkspaceReadyOptions): boolean {
  const { hasOrganization } = opts;

  // If demo mode is not enabled via env, do NOT bypass anything.
  if (!DEMO_MODE) return false;

  // In demo mode, consider workspace "ready" as soon as an org exists.
  return !!hasOrganization;
}

export function isDemoMode(): boolean {
  return DEMO_MODE;
}

export const IS_DEMO_MODE = DEMO_MODE;
