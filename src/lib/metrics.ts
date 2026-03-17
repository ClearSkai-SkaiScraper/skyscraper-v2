// =====================================================
// ADMIN METRICS UTILITIES
// =====================================================
// Calculate reports/day, acceptance rate, tokens used
// Provides data for admin dashboard analytics
// =====================================================

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface DailyMetrics {
  date: string;
  reports: number;
  accepted: number;
  tokens: number;
  acceptanceRate: number;
}

export interface MetricsTotals {
  reports: number;
  accepted: number;
  tokens: number;
  acceptanceRate: number;
  avgTimeToAcceptHours?: number;
}

export interface AdminMetricsResult {
  daysArr: DailyMetrics[];
  totals: MetricsTotals;
  acceptanceRate: number;
}

/**
 * Get admin metrics for organization
 * @param orgId - Organization ID
 * @param days - Number of days to look back (default: 30)
 */
export async function getAdminMetrics(orgId: string, days = 30): Promise<AdminMetricsResult> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Fetch all reports for the period
  const reports = await prisma.ai_reports.findMany({
    where: {
      orgId,
      createdAt: { gte: since },
    },
    select: {
      id: true,
      createdAt: true,
      tokensUsed: true,
      status: true, // Use status field instead of separate date fields
    },
  });

  // Aggregate by day
  const perDay: Record<string, { reports: number; accepted: number; tokens: number }> = {};

  for (const r of reports) {
    const key = r.createdAt.toISOString().slice(0, 10);

    if (!perDay[key]) {
      perDay[key] = { reports: 0, accepted: 0, tokens: 0 };
    }

    perDay[key].reports += 1;
    perDay[key].tokens += r.tokensUsed ?? 1;

    // Consider status='accepted' or 'delivered' as accepted
    if (r.status === "accepted" || r.status === "delivered") {
      perDay[key].accepted += 1;
    }
  }

  // Convert to array
  const daysArr: DailyMetrics[] = Object.keys(perDay)
    .sort()
    .map((k) => ({
      date: k,
      reports: perDay[k].reports,
      accepted: perDay[k].accepted,
      tokens: perDay[k].tokens,
      acceptanceRate: perDay[k].reports > 0 ? (perDay[k].accepted / perDay[k].reports) * 100 : 0,
    }));

  // Calculate totals
  const totals = daysArr.reduce(
    (acc, d) => ({
      reports: acc.reports + d.reports,
      accepted: acc.accepted + d.accepted,
      tokens: acc.tokens + d.tokens,
    }),
    { reports: 0, accepted: 0, tokens: 0 }
  );

  const acceptanceRate = totals.reports ? (totals.accepted / totals.reports) * 100 : 0;

  return {
    daysArr,
    totals: {
      ...totals,
      acceptanceRate,
      avgTimeToAcceptHours: undefined, // TODO: Calculate when sentAt/acceptedAt fields exist
    },
    acceptanceRate,
  };
}

/**
 * Get token usage breakdown by user
 * @param orgId - Organization ID
 * @param days - Number of days to look back
 */
export async function getTokenUsageByUser(orgId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const reports = await prisma.ai_reports.findMany({
    where: {
      orgId,
      createdAt: { gte: since },
    },
    select: {
      userId: true,
      tokensUsed: true,
    },
  });

  const byUser: Record<string, { userId: string; tokens: number; count: number }> = {};

  for (const r of reports) {
    if (!byUser[r.userId]) {
      byUser[r.userId] = { userId: r.userId, tokens: 0, count: 0 };
    }
    byUser[r.userId].tokens += r.tokensUsed ?? 1;
    byUser[r.userId].count += 1;
  }

  return Object.values(byUser).sort((a, b) => b.tokens - a.tokens);
}

/**
 * Get recent report events for audit trail
 * @param orgId - Organization ID
 * @param limit - Number of events to return
 */
export async function getRecentReportEvents(orgId: string, limit = 50) {
  try {
    // Use raw SQL since report_events table not in Prisma schema yet
    const events = await prisma.$queryRaw<any[]>`
      SELECT id, kind, created_at as "createdAt", ip, meta, report_id as "reportId"
      FROM report_events
      WHERE org_id = ${orgId}::uuid
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return events;
  } catch (error) {
    // Table may not exist yet
    logger.error("Error fetching report events:", error);
    return [];
  }
}

// =====================================================
// DASHBOARD KPI METRICS (Supabase)
// =====================================================

import { getSupabaseAdmin } from "./supabaseAdmin";

export async function getDashboardMetrics(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { totalLeads: 0, activeJobs: 0, revenue: 0, conversionRate: 0 };
  }
  const [leads, jobsActive, revenue, conversions] = await Promise.all([
    admin.from("leads").select("id", { count: "exact", head: true }).eq("owner_id", userId),
    admin
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("status", "active"),
    admin.from("jobs").select("revenue_cents").eq("owner_id", userId),
    admin.from("leads").select("status").eq("owner_id", userId),
  ]);

  const totalLeads = leads.count ?? 0;
  const activeJobs = jobsActive.count ?? 0;
  const revenueCents = (revenue.data ?? []).reduce(
    (sum, record: any) => sum + (record.revenue_cents ?? 0),
    0
  );
  const won = (conversions.data ?? []).filter((x: any) => x.status === "won").length;
  const conversionRate = totalLeads === 0 ? 0 : Math.round((won / totalLeads) * 100);

  return {
    totalLeads,
    activeJobs,
    revenue: Math.round(revenueCents) / 100,
    conversionRate,
  };
}
