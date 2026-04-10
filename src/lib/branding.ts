import "server-only";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { pool } from "@/server/db";

// Prisma singleton imported from @/lib/db/prisma

export async function loadBrandingForOrg(orgId: string | null) {
  if (!orgId) return null;
  try {
    return await prisma.org.findUnique({ where: { id: orgId } });
  } catch (err) {
    logger.error("loadBrandingForOrg error", err);
    return null;
  }
}

/**
 * Server-side branding types and functions
 */
export interface OrgBranding {
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
}

/**
 * Get branding for an organization (server-only, uses PostgreSQL pool)
 * Returns fresh data directly from database without cache
 */
export async function getBranding(orgId: string): Promise<OrgBranding | null> {
  try {
    const result = await pool.query(`SELECT * FROM org_branding WHERE "orgId" = $1 LIMIT 1`, [
      orgId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      orgId: row.orgId,
      ownerId: row.ownerId,
      companyName: row.companyName,
      license: row.license,
      phone: row.phone,
      email: row.email,
      website: row.website,
      colorPrimary: row.colorPrimary,
      colorAccent: row.colorAccent,
      logoUrl: row.logoUrl,
      teamPhotoUrl: row.teamPhotoUrl,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  } catch (error) {
    logger.error("[getBranding] Error:", error);
    return null;
  }
}

/**
 * Check if branding is complete
 * Requires: company name (not default), email, and primary color
 */
export function isBrandingComplete(branding: OrgBranding | null): boolean {
  if (!branding) return false;

  return !!(
    branding.companyName &&
    branding.companyName !== "Your Roofing Company LLC" &&
    branding.companyName !== "Your Company" &&
    branding.email &&
    branding.colorPrimary
  );
}

/**
 * Legacy Supabase client-side functions (deprecated, keep for backwards compat)
 */
import { supabase } from "@/integrations/supabase/client";

export interface Branding {
  org_id: string;
  company_name?: string;
  phone?: string;
  email?: string;
  address1?: string;
  city?: string;
  state?: string;
  postal?: string;
  website?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  theme_mode?: "light" | "dark" | null;
}

export async function loadBranding(): Promise<Branding | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("v_branding_for_user")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    logger.error("loadBranding error", error);
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any;
}

// Fallback loader: returns DB branding but falls back to default ClearSkai branding for local/dev preview
import DefaultBrand from "@/config/brandingDefaults";

export async function loadBrandingWithFallback(): Promise<Branding> {
  try {
    const b = await loadBranding();
    if (b) return b as Branding;
  } catch (e) {
    logger.warn("loadBrandingWithFallback: error loading remote branding", e);
  }
  // map DefaultBrand shape to Branding
  return {
    org_id: DefaultBrand.org_id,
    company_name: DefaultBrand.company_name,
    phone: DefaultBrand.phone,
    email: DefaultBrand.email,
    website: DefaultBrand.website,
    primary_color: DefaultBrand.primary_color,
    secondary_color: DefaultBrand.secondary_color,
    accent_color: DefaultBrand.accent_color,
    theme_mode: "light",
  } as Branding;
}

/** Apply to document :root so Tailwind/inline styles can reference */
export function applyBrandTheme(b?: Branding | null) {
  const root = document.documentElement;
  const p = b?.primary_color ?? "#117CFF";
  const s = b?.secondary_color ?? "#0A1A2F";
  const a = b?.accent_color ?? "#FFC838";
  root.style.setProperty("--brand-primary", p);
  root.style.setProperty("--brand-secondary", s);
  root.style.setProperty("--brand-accent", a);
}

/**
 * Fetch company branding for a given Clerk user ID (server-side, Supabase admin)
 */
import { supabaseAdmin } from "./supabaseAdmin";

export interface CompanyBranding {
  logo_url: string | null;
  brand_color: string;
  accent_color: string;
  company_name: string | null;
}

export async function getBrandingForUser(clerkUserId: string): Promise<CompanyBranding | null> {
  try {
    if (!supabaseAdmin) {
      logger.warn("[getBrandingForUser] Supabase admin client not available");
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("logo_url, brand_color, accent_color, company_name")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();

    if (error) {
      logger.error("[getBrandingForUser] Error:", error);
      return null;
    }

    const row = data as {
      logo_url?: string | null;
      brand_color?: string | null;
      accent_color?: string | null;
      company_name?: string | null;
    } | null;
    return row
      ? {
          logo_url: row.logo_url ?? null,
          brand_color: row.brand_color || "#117CFF",
          accent_color: row.accent_color || "#FFC838",
          company_name: row.company_name ?? null,
        }
      : null;
  } catch (err) {
    logger.error("[getBrandingForUser] Unexpected error:", err);
    return null;
  }
}
