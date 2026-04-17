/**
 * Mode Constants for Phase 1A
 *
 * Defines the three primary modes of the application:
 * - Retail: Homeowner/contractor-facing packet generation
 * - Claims: Insurance claims adjusting workflow
 * - Admin: Administrative tools and feature flags
 */

import { isAdminRole } from "@/lib/auth/roleCompare";

export type AppMode = "retail" | "claims" | "admin";

export interface ModeConfig {
  id: AppMode;
  label: string;
  icon: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  routes: {
    projects?: string;
    reports?: string;
    generate: string;
    export: string;
    tools?: string;
  };
  requiredRole?: string[]; // Clerk roles
}

export const MODES: Record<AppMode, ModeConfig> = {
  retail: {
    id: "retail",
    label: "Retail",
    icon: "🏠",
    description: "Homeowner & contractor proposals",
    primaryColor: "#2563eb", // blue-600
    accentColor: "#3b82f6", // blue-500
    routes: {
      projects: "/retail/projects",
      generate: "/retail/generate",
      export: "/retail/export",
    },
  },
  claims: {
    id: "claims",
    label: "Claims",
    icon: "📋",
    description: "Insurance claims adjusting",
    primaryColor: "#0B0B0C", // charcoal
    accentColor: "#FFC838", // yellow
    routes: {
      reports: "/claims/reports",
      generate: "/claims/generate",
      export: "/claims/export",
    },
  },
  admin: {
    id: "admin",
    label: "Admin",
    icon: "⚙️",
    description: "System administration",
    primaryColor: "#7c3aed", // violet-600
    accentColor: "#8b5cf6", // violet-500
    routes: {
      tools: "/admin/tools",
      generate: "/admin/flags",
      export: "/admin/flags",
    },
    requiredRole: ["admin", "org:admin"],
  },
};

export const DEFAULT_MODE: AppMode = "retail";

/**
 * Get mode config by ID
 */
export function getModeConfig(mode: AppMode): ModeConfig {
  return MODES[mode];
}

/**
 * Get available modes for a user based on Clerk roles
 */
export function getAvailableModes(userRoles: string[] = []): AppMode[] {
  const modes: AppMode[] = [];

  // Retail is available to all
  modes.push("retail");

  // Claims available to all (but requires StartDraftGate)
  modes.push("claims");

  // Admin only for specific roles
  const hasAdminRole = userRoles.some((role) => isAdminRole(role) || role.startsWith("org:admin"));
  if (hasAdminRole) {
    modes.push("admin");
  }

  return modes;
}
