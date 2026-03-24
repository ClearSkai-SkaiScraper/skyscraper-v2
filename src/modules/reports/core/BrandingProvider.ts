// ============================================================================
// BRANDING PROVIDER - Fetch & Apply Org Branding
// ============================================================================

import { BRAND_ACCENT, BRAND_PRIMARY, PLATFORM_NAME } from "@/lib/constants/branding";
import prisma from "@/lib/prisma";

import type { BrandingConfig } from "../types";

/**
 * Fetch organization branding from database
 */
export async function fetchOrgBranding(orgId: string, ownerId: string): Promise<BrandingConfig> {
  const branding =
    (await prisma.org_branding
      .findFirst({
        where: { orgId, ownerId },
      })
      .catch(() => null)) ||
    (await prisma.org_branding
      .findFirst({
        where: { orgId },
      })
      .catch(() => null));

  if (!branding) {
    return getDefaultBranding();
  }

  return {
    logoUrl: branding.logoUrl || undefined,
    brandColor: branding.colorPrimary || BRAND_PRIMARY,
    accentColor: branding.colorAccent || BRAND_ACCENT,
    companyName: branding.companyName || PLATFORM_NAME,
    licenseNumber: branding.license || undefined,
    website: branding.website || undefined,
    phone: branding.phone || "",
    email: branding.email || "",
    headshotUrl: branding.teamPhotoUrl || undefined,
  };
}

/**
 * Default fallback branding
 */
export function getDefaultBranding(): BrandingConfig {
  return {
    brandColor: BRAND_PRIMARY,
    accentColor: BRAND_ACCENT,
    companyName: PLATFORM_NAME,
    phone: "(555) 123-4567",
    email: "support@skaiscrape.com",
  };
}

/**
 * Apply branding colors to PDF context
 */
export function applyBrandingColors(branding: BrandingConfig) {
  // Convert hex to RGB for pdf-lib
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : { r: 0.11, g: 0.25, b: 0.69 }; // Default blue
  };

  return {
    brandRgb: hexToRgb(branding.brandColor),
    accentRgb: hexToRgb(branding.accentColor),
  };
}
