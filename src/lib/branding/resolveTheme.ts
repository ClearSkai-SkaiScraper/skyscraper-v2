/**
 * Multi-Tenant Branding Theme Resolver
 *
 * Resolves organization-specific theme customizations
 *
 * @deprecated For server-side branding, use getOrgBranding(orgId)
 * from "@/lib/branding/getOrgBranding" instead.
 */

import { BRAND_PRIMARY } from "@/lib/constants/branding";

export interface BrandTheme {
  primaryGradient: string;
  accentColor: string;
  logoUrl?: string;
  companyName?: string;
}

const defaultTheme: BrandTheme = {
  primaryGradient: "from-blue-600 to-indigo-600",
  accentColor: BRAND_PRIMARY,
};

const themeVariants: Record<string, BrandTheme> = {
  purple: {
    primaryGradient: "from-purple-600 to-pink-600",
    accentColor: "#9333ea",
  },
  emerald: {
    primaryGradient: "from-emerald-600 to-teal-600",
    accentColor: "#059669",
  },
  orange: {
    primaryGradient: "from-orange-600 to-red-600",
    accentColor: "#ea580c",
  },
};

/**
 * Resolve theme for an organization
 * @param orgId - Organization ID
 * @returns Brand theme configuration
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function resolveTheme(orgId: string): Promise<BrandTheme> {
  // TODO: Fetch from database based on orgId
  // const branding = await prisma.org_branding.findFirst({ where: { orgId } });

  // For now, return default theme
  // In production, map org preferences to theme variants
  return defaultTheme;
}

/**
 * Get available theme variants
 */
export function getThemeVariants(): Record<string, BrandTheme> {
  return { default: defaultTheme, ...themeVariants };
}
