import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/rbac";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

/**
 * GET /api/finance/overview — Financial overview metrics for the org
 * Returns: revenue, costs, profit, commissions, AR, invoice stats
 */
export async function GET() {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // RBAC: Only managers+ can view financial data
    await requireRole("manager");

    const orgId = ctx.orgId;

    // Run queries in parallel
    const [financials, commissions, invoiceStats, teamPerf, claimsPipeline] = await Promise.all([
      // Job financials aggregate
      prisma.job_financials
        .aggregate({
          where: { org_id: orgId },
          _sum: {
            contract_amount: true,
            supplement_amount: true,
            material_cost: true,
            labor_cost: true,
            overhead_cost: true,
            other_cost: true,
            amount_invoiced: true,
            amount_collected: true,
          },
          _count: true,
        })
        .catch(() => null),

      // Commission records aggregate
      prisma.commission_records
        .groupBy({
          by: ["status"],
          where: { org_id: orgId },
          _sum: { commission_amount: true },
          _count: true,
        })
        .catch(() => []),

      // Invoice stats from contractor_invoices
      (async () => {
        const jobs = await prisma.crm_jobs.findMany({
          where: { org_id: orgId! },
          select: { id: true },
        });
        const jobIds = jobs.map((j) => j.id);
        if (jobIds.length === 0) return { total: 0, count: 0 };

        const invoices = await prisma.contractor_invoices.findMany({
          where: { job_id: { in: jobIds } },
          select: { totals: true },
        });

        let totalBilled = 0;
        let totalCollected = 0;
        for (const inv of invoices) {
          const t = inv.totals as Record<string, number>;
          totalBilled += t?.total ?? 0;
          totalCollected += t?.paidAmount ?? 0;
        }

        return {
          count: invoices.length,
          totalBilled,
          totalCollected,
          outstanding: totalBilled - totalCollected,
        };
      })(),

      // Team performance aggregate
      prisma.team_performance
        .aggregate({
          where: { orgId: orgId },
          _sum: {
            totalRevenueGenerated: true,
            commissionOwed: true,
            commissionPaid: true,
            commissionPending: true,
            claimsSigned: true,
            claimsApproved: true,
          },
          _count: true,
        })
        .catch(() => null),

      // Claims pipeline — approved job values + pending submissions
      (async () => {
        try {
          const [approved, pending, total] = await Promise.all([
            prisma.claims.aggregate({
              where: { orgId: orgId, jobValueStatus: "approved" },
              _sum: { estimatedJobValue: true },
              _count: true,
            }),
            prisma.claims.aggregate({
              where: { orgId: orgId, jobValueStatus: "submitted" },
              _sum: { estimatedJobValue: true },
              _count: true,
            }),
            prisma.claims.count({
              where: { orgId: orgId, signingStatus: "signed" },
            }),
          ]);
          return {
            approvedValue: Number(approved._sum?.estimatedJobValue ?? 0),
            approvedCount: approved._count ?? 0,
            pendingValue: Number(pending._sum?.estimatedJobValue ?? 0),
            pendingCount: pending._count ?? 0,
            signedCount: total,
          };
        } catch {
          return {
            approvedValue: 0,
            approvedCount: 0,
            pendingValue: 0,
            pendingCount: 0,
            signedCount: 0,
          };
        }
      })(),
    ]);

    // Build commission summary
    const commissionSummary: Record<string, { total: number; count: number }> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const group of commissions as any[]) {
      commissionSummary[group.status] = {
        total: Number(group._sum?.commission_amount ?? 0),
        count: group._count ?? 0,
      };
    }

    const finSum = financials?._sum;
    const totalRevenue =
      Number(finSum?.contract_amount ?? 0) + Number(finSum?.supplement_amount ?? 0);
    const totalCost =
      Number(finSum?.material_cost ?? 0) +
      Number(finSum?.labor_cost ?? 0) +
      Number(finSum?.overhead_cost ?? 0) +
      Number(finSum?.other_cost ?? 0);

    return NextResponse.json({
      success: true,
      data: {
        revenue: {
          total: totalRevenue,
          contract: Number(finSum?.contract_amount ?? 0),
          supplement: Number(finSum?.supplement_amount ?? 0),
        },
        costs: {
          total: totalCost,
          material: Number(finSum?.material_cost ?? 0),
          labor: Number(finSum?.labor_cost ?? 0),
          overhead: Number(finSum?.overhead_cost ?? 0),
          other: Number(finSum?.other_cost ?? 0),
        },
        profit: {
          gross: totalRevenue - totalCost,
          margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
        },
        commissions: commissionSummary,
        invoices: invoiceStats,
        ar: {
          invoiced: Number(finSum?.amount_invoiced ?? 0),
          collected: Number(finSum?.amount_collected ?? 0),
          outstanding: Number(finSum?.amount_invoiced ?? 0) - Number(finSum?.amount_collected ?? 0),
        },
        teamPerformance: {
          totalRevenue: Number(teamPerf?._sum?.totalRevenueGenerated ?? 0),
          commissionOwed: Number(teamPerf?._sum?.commissionOwed ?? 0),
          commissionPaid: Number(teamPerf?._sum?.commissionPaid ?? 0),
          commissionPending: Number(teamPerf?._sum?.commissionPending ?? 0),
          claimsSigned: Number(teamPerf?._sum?.claimsSigned ?? 0),
          claimsApproved: Number(teamPerf?._sum?.claimsApproved ?? 0),
          repCount: teamPerf?._count ?? 0,
        },
        jobCount: financials?._count ?? 0,
        claimsPipeline: claimsPipeline,
      },
    });
  } catch (err) {
    // Re-throw Next.js internal redirect errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    logger.error("[API] finance/overview error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
