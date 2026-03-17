/**
 * Organization DB Fetchers - Server-only
 * Centralized organization data access
 */

import "server-only";

import { logger } from "@/lib/logger";
import { pool } from "@/server/db";

export interface Organization {
  id: string;
  orgId: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  license: string | null;
  colorPrimary: string | null;
  colorAccent: string | null;
  logoUrl: string | null;
  teamPhotoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get full organization details
 * Includes branding, contact info, and metadata
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  try {
    const result = await pool.query(
      `SELECT * FROM org_branding WHERE "orgId" = $1 LIMIT 1`,
      [orgId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      orgId: row.orgId,
      companyName: row.companyName,
      email: row.email,
      phone: row.phone,
      website: row.website,
      license: row.license,
      colorPrimary: row.colorPrimary,
      colorAccent: row.colorAccent,
      logoUrl: row.logoUrl,
      teamPhotoUrl: row.teamPhotoUrl,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  } catch (error) {
    logger.error("[getOrganization] Error:", error);
    return null;
  }
}

/**
 * Get organization theme colors
 * Quick helper for theming components
 */
export async function getOrgTheme(orgId: string): Promise<{
  primary: string;
  accent: string;
} | null> {
  try {
    const result = await pool.query(
      `SELECT "colorPrimary", "colorAccent" FROM org_branding WHERE "orgId" = $1 LIMIT 1`,
      [orgId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      primary: result.rows[0].colorPrimary || "#117CFF",
      accent: result.rows[0].colorAccent || "#FFC838",
    };
  } catch (error) {
    logger.error("[getOrgTheme] Error:", error);
    return null;
  }
}

/**
 * Check if organization exists
 */
export async function organizationExists(orgId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT 1 FROM org_branding WHERE "orgId" = $1 LIMIT 1`,
      [orgId]
    );
    return result.rows.length > 0;
  } catch (error) {
    logger.error("[organizationExists] Error:", error);
    return false;
  }
}
