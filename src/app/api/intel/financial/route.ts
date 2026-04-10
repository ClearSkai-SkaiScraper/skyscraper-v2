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
import { AZ_DEFAULT_TAX_RATE } from "@/lib/constants/taxRates";
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

    // Build analysis conforming to FinancialAnalysisResult type
    // All values stored in cents — convert to dollars for display/analysis
    const estimatedValue = (claim.estimatedValue || 0) / 100;
    const approvedValue = (claim.approvedValue || 0) / 100;
    const deductible = (claim.deductible || 0) / 100;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalPayments = payments.reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0);
    const totalSupplements = supplements.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, s: any) => sum + (s.total_cents || 0),
      0
    );

    const underpayment = Math.max(0, estimatedValue - approvedValue);
    const taxRate = AZ_DEFAULT_TAX_RATE;
    const carrierTax = approvedValue * taxRate;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const contractorTax = estimatedValue * taxRate;

    const analysis = {
      totals: {
        rcvCarrier: approvedValue,
        rcvContractor: estimatedValue,
        acvCarrier: Math.round(approvedValue * 0.85),
        acvContractor: Math.round(estimatedValue * 0.85),
        overage: Math.max(0, approvedValue - estimatedValue),
        underpayment,
        deductible,
        tax: Math.round(carrierTax),
        netOwed: approvedValue - deductible - totalPayments / 100,
      },
      depreciation: {
        type: "flat" as const,
        carrierApplied: Math.round(approvedValue * 0.15),
        correctAmount: Math.round(estimatedValue * 0.15),
        difference: Math.round((estimatedValue - approvedValue) * 0.15),
        explanation: `Standard 15% depreciation applied. Carrier: $${Math.round(approvedValue * 0.15).toLocaleString()}, Contractor estimate: $${Math.round(estimatedValue * 0.15).toLocaleString()}.`,
        violations: [],
      },
      lineItemAnalysis: [],
      settlementProjection: {
        min: Math.round((approvedValue + totalSupplements / 100) * 0.85),
        max: Math.round((estimatedValue + totalSupplements / 100) * 1.1),
        expected: approvedValue + totalSupplements / 100,
        confidence: approvedValue > 0 ? 70 : 30,
        factors: [
          approvedValue === 0
            ? "No carrier approval yet — high uncertainty"
            : "Carrier estimate approved",
          totalSupplements > 0
            ? `${supplements.length} supplement(s) on file`
            : "No supplements filed",
          totalPayments > 0
            ? `$${(totalPayments / 100).toLocaleString()} in payments received`
            : "No payments received yet",
        ],
      },
      requiredSupplements: supplements
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((s: any) => s.status === "pending" || s.status === "submitted")
        .map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) =>
            `Supplement #${s.id?.slice(0, 8)} — $${((s.total_cents || 0) / 100).toLocaleString()} (${s.status})`
        ),
      summary:
        underpayment > 0
          ? `Carrier approved $${approvedValue.toLocaleString()} vs contractor estimate of $${estimatedValue.toLocaleString()}, an underpayment of $${underpayment.toLocaleString()}. Deductible is $${deductible.toLocaleString()}. ${totalPayments > 0 ? `$${(totalPayments / 100).toLocaleString()} in payments received.` : "No payments received yet."}`
          : approvedValue === 0
            ? `Claim has a contractor estimate of $${estimatedValue.toLocaleString()} but no carrier approval yet. Deductible is $${deductible.toLocaleString()}.`
            : `Carrier approved $${approvedValue.toLocaleString()} matching or exceeding the contractor estimate. Deductible is $${deductible.toLocaleString()}. ${totalPayments > 0 ? `$${(totalPayments / 100).toLocaleString()} paid.` : "No payments yet."}`,
      underpaymentReasons:
        underpayment > 0
          ? [
              `Carrier RCV ($${approvedValue.toLocaleString()}) is below contractor RCV ($${estimatedValue.toLocaleString()})`,
              ...(totalPayments === 0 ? ["No payments have been released"] : []),
            ]
          : [],
      auditFindings: [
        ...(approvedValue === 0
          ? [
              {
                category: "Missing Data",
                issue: "No carrier approval on file",
                impact: estimatedValue,
                severity: "high" as const,
              },
            ]
          : []),
        ...(totalPayments === 0 && approvedValue > 0
          ? [
              {
                category: "Collections",
                issue: "No payments received despite carrier approval",
                impact: approvedValue - deductible,
                severity: "high" as const,
              },
            ]
          : []),
        ...(totalSupplements === 0 && approvedValue > 0
          ? [
              {
                category: "Revenue Opportunity",
                issue: "No supplements filed — review for missed items",
                impact: Math.round(estimatedValue * 0.1),
                severity: "medium" as const,
              },
            ]
          : []),
      ],
    };

    return NextResponse.json({ analysis });
  } catch (error) {
    if (error instanceof OrgScopeError) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    logger.error("[POST /api/intel/financial] Error:", error);
    return NextResponse.json({ error: "Failed to run financial analysis" }, { status: 500 });
  }
});
