/**
 * UNIVERSAL BRANDING FETCHER FOR PDF GENERATION
 * Fetches organization branding with proper types and error handling
 *
 * @deprecated Prefer importing from "@/lib/branding/getOrgBranding" instead.
 *   - getOrgBranding(orgId)       → replaces getBrandingForOrg(orgId)
 *   - getOrgBrandingForPdf(orgId) → replaces getBrandingForOrg + getBrandingWithDefaults
 */

import { BRAND_ACCENT, BRAND_PRIMARY, PLATFORM_NAME } from "@/lib/constants/branding";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type OrgBranding = {
  id: string;
  orgId: string;
  ownerId: string;
  companyName: string | null;
  license: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  colorPrimary: string | null;
  colorAccent: string | null;
  logoUrl: string | null;
  teamPhotoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Fetch branding for an organization (for PDF generation)
 * Returns null if not found or error occurs
 *
 * @deprecated Use getOrgBranding(orgId) from "@/lib/branding/getOrgBranding" instead.
 */
export async function getBrandingForOrg(orgId: string): Promise<OrgBranding | null> {
  if (!orgId) {
    logger.warn("[PDF Branding] No orgId provided");
    return null;
  }

  try {
    const branding = await prisma.org_branding.findFirst({
      where: { orgId },
    });

    return branding as OrgBranding | null;
  } catch (error) {
    logger.error(`[PDF Branding] Failed to fetch branding for orgId: ${orgId}`, error);
    return null;
  }
}

/**
 * Get branding with fallback defaults for PDF generation
 *
 * @deprecated Use getOrgBrandingForPdf(orgId) from "@/lib/branding/getOrgBranding" instead.
 */
export function getBrandingWithDefaults(branding: OrgBranding | null) {
  return {
    logo: branding?.logoUrl ?? null,
    primaryColor: branding?.colorPrimary ?? BRAND_PRIMARY,
    secondaryColor: branding?.colorAccent ?? BRAND_ACCENT,
    businessName: branding?.companyName ?? PLATFORM_NAME,
    phone: branding?.phone ?? "",
    email: branding?.email ?? "",
    website: branding?.website ?? "",
    license: branding?.license ?? "",
  };
}
