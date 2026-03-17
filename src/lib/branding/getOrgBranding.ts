// src/lib/branding/getOrgBranding.ts
/**
 * Branding Helper - Centralized company branding retrieval
 * Used by all PDF generators for consistent headers/footers
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface BrandingInfo {
  companyName: string;
  addressLine: string;
  phone: string;
  email: string;
  website: string;
  rocNumber: string;
  logoUrl: string | null;
  colorPrimary: string;
  colorAccent: string;
  warrantiesText: string;
  lienWaiverText: string;
}

/**
 * Get organization branding with safe defaults
 * Never crashes - returns placeholder values if data missing
 */
export async function getOrgBranding(orgId: string): Promise<BrandingInfo> {
  try {
    const branding = await prisma.org_branding.findFirst({
      where: { orgId },
      select: {
        companyName: true,
        license: true,
        phone: true,
        email: true,
        website: true,
        colorPrimary: true,
        colorAccent: true,
        logoUrl: true,
      },
    });

    if (!branding) {
      // Return safe defaults
      return {
        companyName: "Your Company",
        addressLine: "",
        phone: "",
        email: "",
        website: "",
        rocNumber: "",
        logoUrl: null,
        colorPrimary: "#117CFF",
        colorAccent: "#FFC838",
        warrantiesText: "10 Year Workmanship Warranty included.",
        lienWaiverText:
          "Upon receipt of funds, no materials or mechanic's lien will be filed against this property.",
      };
    }

    return {
      companyName: branding.companyName || "Your Company",
      addressLine: "", // Can be extended when address fields added to schema
      phone: branding.phone || "",
      email: branding.email || "",
      website: branding.website || "",
      rocNumber: branding.license || "",
      logoUrl: branding.logoUrl || null,
      colorPrimary: branding.colorPrimary || "#117CFF",
      colorAccent: branding.colorAccent || "#FFC838",
      warrantiesText:
        "10 Year Workmanship Warranty. 50 Year Manufacturer's Warranty (if applicable).",
      lienWaiverText:
        "All work completed in compliance with the contract. Upon collection of funds, no materials or mechanic's lien will be filed against this property.",
    };
  } catch (error) {
    logger.error("[getOrgBranding] Error:", error);

    // Return defaults on error
    return {
      companyName: "Your Company",
      addressLine: "",
      phone: "",
      email: "",
      website: "",
      rocNumber: "",
      logoUrl: null,
      colorPrimary: "#117CFF",
      colorAccent: "#FFC838",
      warrantiesText: "10 Year Workmanship Warranty included.",
      lienWaiverText: "Upon receipt of funds, no materials or mechanic's lien will be filed.",
    };
  }
}
