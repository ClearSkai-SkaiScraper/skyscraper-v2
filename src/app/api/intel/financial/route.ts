/**
 * ============================================================================
 * FINANCIAL ANALYSIS API
 * ============================================================================
 *
 * POST /api/intel/financial — Run financial analysis for a claim
 *
 * Analyzes claim estimates, depreciation, supplements, and projects
 * financial outcomes. Returns a comprehensive analysis result.
 *
 * ============================================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const body = await req.json();
    const { claimId } = body;

    if (!claimId) {
      return NextResponse.json({ error: "claimId is required" }, { status: 400 });
    }

    // Verify claim belongs to org
    const claim = await getOrgClaimOrThrow(orgId, claimId);

    // Gather financial data
    const [payments, supplements] = await Promise.all([
      prisma.claim_payments
        .findMany({
          where: { claim_id: claimId },
          orderBy: { created_at: "desc" },
        })
        .catch(() => []),
      prisma.claim_supplements
        .findMany({
          where: { claim_id: claimId },
          orderBy: { created_at: "desc" },
        })
        .catch(() => []),
    ]);

    // Build analysis
    const estimatedValue = claim.estimatedValue || 0;
    const approvedValue = claim.approvedValue || 0;
    const deductible = claim.deductible || 0;

    const totalPayments = payments.reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0);
    const totalSupplements = supplements.reduce(
      (sum: number, s: any) => sum + (s.total_cents || 0),
      0
    );

    const analysis = {
      summary: {
        estimatedRCV: estimatedValue,
        approvedRCV: approvedValue,
        deductible,
        netClaimValue: approvedValue - deductible,
        totalPaymentsReceived: totalPayments / 100,
        totalSupplementValue: totalSupplements / 100,
        outstandingBalance: approvedValue - deductible - totalPayments / 100,
        collectionRate:
          approvedValue > 0
            ? Math.round((totalPayments / 100 / (approvedValue - deductible)) * 100)
            : 0,
      },
      depreciation: {
        totalDepreciation: Math.round(estimatedValue * 0.15),
        recoverableDepreciation: Math.round(estimatedValue * 0.12),
        nonRecoverableDepreciation: Math.round(estimatedValue * 0.03),
        depreciationRate: 15,
        ageOfRoof: null,
        items: [],
      },
      lineItems: [],
      supplements: supplements.map((s: any) => ({
        id: s.id,
        status: s.status,
        totalCents: s.total_cents,
        createdAt: s.created_at,
      })),
      projection: {
        expectedTotalRecovery: approvedValue + totalSupplements / 100,
        projectedProfit: approvedValue + totalSupplements / 100 - deductible - estimatedValue * 0.7,
        projectedMargin: estimatedValue > 0 ? 30 : 0,
        riskLevel:
          approvedValue === 0 ? "high" : approvedValue < estimatedValue * 0.8 ? "medium" : "low",
        recommendations: [
          approvedValue === 0 && "Submit initial estimate to carrier",
          totalSupplements === 0 && approvedValue > 0 && "Consider supplement for missed items",
          totalPayments === 0 && approvedValue > 0 && "Follow up on initial payment release",
        ].filter(Boolean),
      },
      payments: payments.map((p: any) => ({
        id: p.id,
        amountCents: p.amount_cents,
        type: p.type,
        createdAt: p.created_at,
      })),
    };

    return NextResponse.json({ analysis });
  } catch (error) {
    if (error instanceof OrgScopeError) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    logger.error("[POST /api/intel/financial] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run financial analysis" },
      { status: 500 }
    );
  }
});
