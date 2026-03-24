// src/lib/branding/getOrgBranding.ts
/**
 * ═══════════════════════════════════════════════════════════
 * CANONICAL Branding Fetcher — Single Source of Truth
 * ═══════════════════════════════════════════════════════════
 *
 * ALL server-side branding retrieval MUST go through this file.
 * Consolidates 12+ competing implementations into one.
 *
 * Exports:
 *   - getOrgBranding(orgId)           — full branding for components & reports
 *   - getOrgBrandingForPdf(orgId)     — branding + Org-level PDF header/footer/logo
 *   - getOrgBrandingByOwner(orgId, ownerId) — owner-specific branding (multi-user orgs)
 *   - BrandingInfo                    — full interface
 *   - PdfBrandingInfo                 — extends BrandingInfo with PDF fields
 *
 * @see src/lib/constants/branding.ts — canonical color constants
 * @see MASTER_HARDENING_AUDIT.md — BRAND-002
 */

import {
  BRAND_ACCENT,
  BRAND_PRIMARY,
  PDF_FOOTER_DEFAULT,
  PDF_HEADER_DEFAULT,
  PLATFORM_NAME,
} from "@/lib/constants/branding";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ─── Interfaces ──────────────────────────────────────────

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
  headshotUrl: string | null;
  warrantiesText: string;
  lienWaiverText: string;
}

/** Extended branding for PDF generators — adds Org-level header/footer/logo */
export interface PdfBrandingInfo extends BrandingInfo {
  /** From Org.pdfHeaderText (falls back to PDF_HEADER_DEFAULT) */
  pdfHeaderText: string;
  /** From Org.pdfFooterText (falls back to PDF_FOOTER_DEFAULT) */
  pdfFooterText: string;
  /** From Org.brandLogoUrl — secondary logo fallback */
  orgLogoUrl: string | null;
  /** Org name from Org table (used if org_branding.companyName is blank) */
  orgName: string;
}

// ─── Default Builder ─────────────────────────────────────

function buildDefaults(): BrandingInfo {
  return {
    companyName: "Your Company",
    addressLine: "",
    phone: "",
    email: "",
    website: "",
    rocNumber: "",
    logoUrl: null,
    colorPrimary: BRAND_PRIMARY,
    colorAccent: BRAND_ACCENT,
    headshotUrl: null,
    warrantiesText: "10 Year Workmanship Warranty included.",
    lienWaiverText:
      "Upon receipt of funds, no materials or mechanic's lien will be filed against this property.",
  };
}

// ─── Core: map a DB row → BrandingInfo ───────────────────

type BrandingRow = {
  companyName: string | null;
  license: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  colorPrimary: string | null;
  colorAccent: string | null;
  logoUrl: string | null;
  teamPhotoUrl?: string | null;
};

function mapRow(row: BrandingRow): BrandingInfo {
  return {
    companyName: row.companyName || "Your Company",
    addressLine: "", // Extended when address fields added to schema
    phone: row.phone || "",
    email: row.email || "",
    website: row.website || "",
    rocNumber: row.license || "",
    logoUrl: row.logoUrl || null,
    colorPrimary: row.colorPrimary || BRAND_PRIMARY,
    colorAccent: row.colorAccent || BRAND_ACCENT,
    headshotUrl: row.teamPhotoUrl || null,
    warrantiesText:
      "10 Year Workmanship Warranty. 50 Year Manufacturer's Warranty (if applicable).",
    lienWaiverText:
      "All work completed in compliance with the contract. Upon collection of funds, no materials or mechanic's lien will be filed against this property.",
  };
}

// ─── Primary Fetcher ─────────────────────────────────────

/**
 * Get organization branding with safe defaults.
 * Never crashes — returns placeholder values if data missing.
 *
 * This is the CANONICAL server-side branding fetcher.
 * All other branding functions should delegate here.
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
        teamPhotoUrl: true,
      },
    });

    if (!branding) return buildDefaults();
    return mapRow(branding);
  } catch (error) {
    logger.error("[BRANDING_FETCH]", { orgId, error });
    return buildDefaults();
  }
}

// ─── Owner-Specific Fetcher ──────────────────────────────

/**
 * Get branding for a specific owner within an org.
 * Falls back to org-level branding, then defaults.
 *
 * Use this when multi-user orgs need per-contractor branding.
 */
export async function getOrgBrandingByOwner(orgId: string, ownerId: string): Promise<BrandingInfo> {
  try {
    // Try owner-specific first, then fall back to org-level
    const branding =
      (await prisma.org_branding.findFirst({ where: { orgId, ownerId } }).catch(() => null)) ||
      (await prisma.org_branding.findFirst({ where: { orgId } }).catch(() => null));

    if (!branding) return buildDefaults();
    return mapRow(branding as BrandingRow);
  } catch (error) {
    logger.error("[BRANDING_FETCH_OWNER]", { orgId, ownerId, error });
    return buildDefaults();
  }
}

// ─── PDF Fetcher (includes Org-level header/footer) ──────

/**
 * Get branding for PDF generation — includes Org-level pdfHeaderText,
 * pdfFooterText, and brandLogoUrl from the Org table.
 *
 * Replaces:
 *   - getOrgBranding() in src/lib/pdf/utils.ts (raw SQL on Org table)
 *   - getBrandingForOrg() + getBrandingWithDefaults() in fetchBranding.ts
 */
export async function getOrgBrandingForPdf(orgId: string): Promise<PdfBrandingInfo> {
  try {
    const [branding, org] = await Promise.all([
      prisma.org_branding.findFirst({
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
          teamPhotoUrl: true,
        },
      }),
      prisma.org.findUnique({
        where: { id: orgId },
        select: {
          name: true,
          brandLogoUrl: true,
          pdfHeaderText: true,
          pdfFooterText: true,
        },
      }),
    ]);

    const base = branding ? mapRow(branding) : buildDefaults();

    // Override companyName with Org name if branding row had no name
    if (!branding?.companyName && org?.name) {
      base.companyName = org.name;
    }

    // Fall back to Org.brandLogoUrl if org_branding has no logo
    if (!base.logoUrl && org?.brandLogoUrl) {
      base.logoUrl = org.brandLogoUrl;
    }

    return {
      ...base,
      pdfHeaderText: org?.pdfHeaderText || PDF_HEADER_DEFAULT,
      pdfFooterText: org?.pdfFooterText || PDF_FOOTER_DEFAULT,
      orgLogoUrl: org?.brandLogoUrl || null,
      orgName: org?.name || PLATFORM_NAME,
    };
  } catch (error) {
    logger.error("[BRANDING_FETCH_PDF]", { orgId, error });
    const defaults = buildDefaults();
    return {
      ...defaults,
      pdfHeaderText: PDF_HEADER_DEFAULT,
      pdfFooterText: PDF_FOOTER_DEFAULT,
      orgLogoUrl: null,
      orgName: PLATFORM_NAME,
    };
  }
}
