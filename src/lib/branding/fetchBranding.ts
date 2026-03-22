/**
 * UNIVERSAL BRANDING FETCHER FOR PDF GENERATION
 * Fetches organization branding with proper types and error handling
 */

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
 */
export function getBrandingWithDefaults(branding: OrgBranding | null) {
  return {
    logo: branding?.logoUrl ?? null,
    primaryColor: branding?.colorPrimary ?? "#0A1A2F",
    secondaryColor: branding?.colorAccent ?? "#117CFF",
    businessName: branding?.companyName ?? "SkaiScraper",
    phone: branding?.phone ?? "",
    email: branding?.email ?? "",
    website: branding?.website ?? "",
    license: branding?.license ?? "",
  };
}
