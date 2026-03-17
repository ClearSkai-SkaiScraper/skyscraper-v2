/**
 * Unified DB Fetchers - Server-only
 * Centralized data access layer for organization metrics
 */

import "server-only";

import { logger } from "@/lib/logger";
import { pool } from "@/server/db";

export interface OrgMetrics {
  totalLeads: number;
  activeJobs: number;
  revenue: number;
  conversionRate: number;
  reportsGenerated: number;
  inspectionsCompleted: number;
}

/**
 * Get organization metrics from database
 * Returns comprehensive dashboard statistics
 */
export async function getOrgMetrics(orgId: string): Promise<OrgMetrics> {
  try {
    // Try to get real metrics from database
    const result = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT l.id) as total_leads,
        COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'active') as active_jobs,
        COALESCE(SUM(j.total_cost), 0) as revenue,
        CASE 
          WHEN COUNT(DISTINCT l.id) > 0 
          THEN (COUNT(DISTINCT j.id)::float / COUNT(DISTINCT l.id)::float * 100)
          ELSE 0 
        END as conversion_rate,
        COUNT(DISTINCT r.id) as reports_generated,
        COUNT(DISTINCT i.id) as inspections_completed
      FROM org_branding ob
      LEFT JOIN leads l ON l.org_id = ob."orgId"
      LEFT JOIN jobs j ON j.org_id = ob."orgId"
      LEFT JOIN reports r ON r.org_id = ob."orgId"
      LEFT JOIN inspections i ON i.org_id = ob."orgId"
      WHERE ob."orgId" = $1
      GROUP BY ob."orgId"
      `,
      [orgId]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        totalLeads: parseInt(row.total_leads) || 0,
        activeJobs: parseInt(row.active_jobs) || 0,
        revenue: parseFloat(row.revenue) || 0,
        conversionRate: parseFloat(row.conversion_rate) || 0,
        reportsGenerated: parseInt(row.reports_generated) || 0,
        inspectionsCompleted: parseInt(row.inspections_completed) || 0,
      };
    }

    // Fallback: return zeros if no data
    return {
      totalLeads: 0,
      activeJobs: 0,
      revenue: 0,
      conversionRate: 0,
      reportsGenerated: 0,
      inspectionsCompleted: 0,
    };
  } catch (error) {
    logger.error("[getOrgMetrics] Error:", error);
    // Return zeros on error to prevent dashboard crash
    return {
      totalLeads: 0,
      activeJobs: 0,
      revenue: 0,
      conversionRate: 0,
      reportsGenerated: 0,
      inspectionsCompleted: 0,
    };
  }
}

/**
 * Get organization profile
 * Basic org info for headers and metadata
 */
export async function getOrgProfile(orgId: string) {
  try {
    const result = await pool.query(
      `SELECT "orgId", "companyName", "email", "phone", "website" 
       FROM org_branding 
       WHERE "orgId" = $1 
       LIMIT 1`,
      [orgId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error("[getOrgProfile] Error:", error);
    return null;
  }
}
