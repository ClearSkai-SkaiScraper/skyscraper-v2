export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";

import { apiError, apiOk } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

// ---------------------------------------------------------------------------
// GET /api/financial/reports — Aggregated financial reports for the org
// Supports: ?range=mtd|qtd|ytd|all (default: ytd)
// ---------------------------------------------------------------------------

function getDateRange(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case "mtd":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "qtd": {
      const q = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), q, 1);
    }
    case "ytd":
      return new Date(now.getFullYear(), 0, 1);
    case "all":
      return null;
    default:
      return new Date(now.getFullYear(), 0, 1);
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }

    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "ytd";
    const since = getDateRange(range);

    // Get all org jobs
    const orgJobs = await prisma.crm_jobs.findMany({
      where: { org_id: ctx.orgId },
      select: { id: true, status: true, created_at: true },
    });
    const jobIds = orgJobs.map((j) => j.id);

    if (jobIds.length === 0) {
      return apiOk({
        summary: {
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          profitMargin: 0,
          totalInvoiced: 0,
          totalCollected: 0,
          totalOutstanding: 0,
        },
        breakdown: { labor: 0, materials: 0, overhead: 0, other: 0 },
        revenueBreakdown: { contractRevenue: 0, supplementRevenue: 0 },
        jobCount: 0,
        range,
      });
    }

    // Aggregate job_financials
    const whereClause: any = { jobId: { in: jobIds } };
    if (since) {
      whereClause.updatedAt = { gte: since };
    }

    const financials = await prisma.job_financials.findMany({
      where: whereClause,
    });

    const agg = financials.reduce(
      (acc, f) => ({
        contractRevenue: acc.contractRevenue + Number(f.contract_amount || 0),
        supplementRevenue: acc.supplementRevenue + Number(f.supplement_amount || 0),
        totalRevenue: acc.totalRevenue + Number(f.total_revenue || 0),
        laborCost: acc.laborCost + Number(f.labor_cost || 0),
        materialCost: acc.materialCost + Number(f.material_cost || 0),
        overheadCost: acc.overheadCost + Number(f.overhead_cost || 0),
        otherCost: acc.otherCost + Number(f.other_cost || 0),
        totalCost: acc.totalCost + Number(f.total_cost || 0),
        grossProfit: acc.grossProfit + Number(f.gross_profit || 0),
        amountInvoiced: acc.amountInvoiced + Number(f.amount_invoiced || 0),
        amountCollected: acc.amountCollected + Number(f.amount_collected || 0),
        amountOutstanding: acc.amountOutstanding + Number(f.amount_outstanding || 0),
      }),
      {
        contractRevenue: 0,
        supplementRevenue: 0,
        totalRevenue: 0,
        laborCost: 0,
        materialCost: 0,
        overheadCost: 0,
        otherCost: 0,
        totalCost: 0,
        grossProfit: 0,
        amountInvoiced: 0,
        amountCollected: 0,
        amountOutstanding: 0,
      }
    );

    const profitMargin =
      agg.totalRevenue > 0 ? Math.round((agg.grossProfit / agg.totalRevenue) * 1000) / 10 : 0;

    // Commission expense (separate model)
    let commissionExpense = 0;
    try {
      const commissions = await prisma.commission_records.findMany({
        where: { org_id: ctx.orgId, ...(since ? { created_at: { gte: since } } : {}) },
        select: { commission_amount: true },
      });
      commissionExpense = commissions.reduce((s, c) => s + Number(c.commission_amount || 0), 0);
    } catch {
      // commission_records may not exist in all envs
    }

    return apiOk({
      summary: {
        totalRevenue: agg.totalRevenue,
        totalExpenses: agg.totalCost + commissionExpense,
        netProfit: agg.grossProfit - commissionExpense,
        profitMargin,
        totalInvoiced: agg.amountInvoiced,
        totalCollected: agg.amountCollected,
        totalOutstanding: agg.amountOutstanding,
      },
      breakdown: {
        labor: agg.laborCost,
        materials: agg.materialCost,
        overhead: agg.overheadCost,
        other: agg.otherCost,
        commissions: commissionExpense,
      },
      revenueBreakdown: {
        contractRevenue: agg.contractRevenue,
        supplementRevenue: agg.supplementRevenue,
      },
      jobCount: financials.length,
      range,
    });
  } catch (err: any) {
    logger.error("[financial-reports]", err);
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}
