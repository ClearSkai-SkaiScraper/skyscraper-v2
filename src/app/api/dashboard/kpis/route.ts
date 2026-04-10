import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ── Status → pipeline-stage mapping ────────────────────────────────
const STAGE_MAP: Record<string, string> = {
  new: "Lead Intake",
  lead: "Lead Intake",
  intake: "Lead Intake",
  inspection: "Inspection Scheduled",
  inspection_scheduled: "Inspection Scheduled",
  inspection_completed: "Inspection Completed",
  estimate: "Estimate Drafting",
  estimate_drafting: "Estimate Drafting",
  submitted: "Submitted",
  in_review: "In Review",
  supplementing: "Supplementing",
  approved: "Approved",
  pending_approval: "Approved",
  in_production: "In Production",
  build: "In Production",
  scheduled: "In Production",
  in_progress: "In Production",
  closed: "Completed",
  completed: "Completed",
  paid: "Completed",
};

function normalizeStatus(s: string | null): string {
  if (!s) return "new";
  return s.toLowerCase().replace(/[\s-]+/g, "_");
}

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";
    const now = new Date();

    // Determine date filter from range param
    let rangeStart: Date;
    switch (range) {
      case "7d":
        rangeStart = new Date(now.getTime() - 7 * 86_400_000);
        break;
      case "90d":
        rangeStart = new Date(now.getTime() - 90 * 86_400_000);
        break;
      case "all":
        rangeStart = new Date(0);
        break;
      default: // 30d
        rangeStart = new Date(now.getTime() - 30 * 86_400_000);
    }

    // ── Parallel data fetch ────────────────────────────────────────
    const [
      allClaims,
      paymentsResult,
      supplementsResult,
      estimatesResult,
      predictionsResult,
      propertiesResult,
    ] = await Promise.all([
      // 1) All claims for this org
      prisma.claims
        .findMany({
          where: { orgId, archivedAt: null },
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            estimatedValue: true,
            approvedValue: true,
          },
        })
        .catch((err) => {
          logger.error("[KPI] Claims fetch failed:", err);
          return [] as any[];
        }),

      // 2) Payments (revenue)
      prisma.payments
        .findMany({
          where: { org_id: orgId, created_at: { gte: rangeStart } },
          select: { amount: true },
        })
        .catch((err) => {
          logger.error("[KPI] Payments fetch failed:", err);
          return [] as any[];
        }),

      // 3) Supplements
      prisma.supplements
        .findMany({
          where: { org_id: orgId },
          select: { id: true, status: true, total: true, created_at: true },
        })
        .catch((err) => {
          logger.error("[KPI] Supplements fetch failed:", err);
          return [] as any[];
        }),

      // 4) Estimates
      prisma.estimates
        .findMany({
          where: { orgId },
          select: { id: true, total: true, status: true },
        })
        .catch((err) => {
          logger.error("[KPI] Estimates fetch failed:", err);
          return [] as any[];
        }),

      // 5) AI Predictions (risk)
      prisma.claimPrediction
        .findMany({
          where: { orgId },
          select: {
            probabilityFull: true,
            probabilityPart: true,
            probabilityDeny: true,
            confidenceScore: true,
            riskFlags: true,
          },
        })
        .catch((err) => {
          logger.error("[KPI] Predictions fetch failed:", err);
          return [] as any[];
        }),

      // 6) Properties (zip codes / roof sizes)
      prisma.properties
        .findMany({
          where: { orgId },
          select: { zipCode: true, squareFootage: true },
        })
        .catch((err) => {
          logger.error("[KPI] Properties fetch failed:", err);
          return [] as any[];
        }),
    ]);

    // ── Claims pipeline ────────────────────────────────────────────
    const rangeClaims = allClaims.filter((c: any) => range === "all" || c.createdAt >= rangeStart);
    const closedStatuses = new Set(["closed", "completed", "paid"]);
    const approvedStatuses = new Set([
      "approved",
      "pending_approval",
      "in_production",
      "build",
      "closed",
      "completed",
      "paid",
    ]);

    const claimsPerStage: Record<string, number> = {};
    for (const c of rangeClaims) {
      const norm = normalizeStatus(c.status);
      const stage = STAGE_MAP[norm] || "Lead Intake";
      claimsPerStage[stage] = (claimsPerStage[stage] || 0) + 1;
    }

    // Ensure all known stages appear
    const stageOrder = [
      "Lead Intake",
      "Inspection Scheduled",
      "Inspection Completed",
      "Estimate Drafting",
      "Submitted",
      "In Review",
      "Supplementing",
      "Approved",
      "In Production",
      "Completed",
    ];
    const orderedStages: Record<string, number> = {};
    for (const s of stageOrder) {
      orderedStages[s] = claimsPerStage[s] || 0;
    }

    // Avg cycle time (closed claims)
    const closedClaims = allClaims.filter((c: any) =>
      closedStatuses.has(normalizeStatus(c.status))
    );
    const avgCycleTime =
      closedClaims.length > 0
        ? Math.round(
            closedClaims.reduce(
              (sum: number, c: any) =>
                sum + (c.updatedAt.getTime() - c.createdAt.getTime()) / 86_400_000,
              0
            ) / closedClaims.length
          )
        : 0;

    // Approval ratio
    const approvedCount = allClaims.filter((c: any) =>
      approvedStatuses.has(normalizeStatus(c.status))
    ).length;
    const approvalRatio = allClaims.length > 0 ? approvedCount / allClaims.length : 0;

    // ── Revenue ────────────────────────────────────────────────────
    const totalRevenue = paymentsResult.reduce(
      (sum: number, p: any) => sum + Number(p.amount || 0),
      0
    );

    // ── Supplements ────────────────────────────────────────────────
    const supplementCount = supplementsResult.length;
    const supplementRatio = allClaims.length > 0 ? supplementCount / allClaims.length : 0;

    // ── Material / roof metrics ────────────────────────────────────
    const roofSizes = propertiesResult
      .map((p: any) => Number(p.squareFootage || 0))
      .filter((v: number) => v > 0);
    const avgRoofSize =
      roofSizes.length > 0
        ? Math.round(roofSizes.reduce((a: number, b: number) => a + b, 0) / roofSizes.length)
        : 0;

    const estimateTotals = estimatesResult
      .map((e: any) => Number(e.total || 0))
      .filter((v: number) => v > 0);
    const avgMaterialCost =
      estimateTotals.length > 0
        ? Math.round(
            estimateTotals.reduce((a: number, b: number) => a + b, 0) / estimateTotals.length
          )
        : 0;

    // ── Jobs by zip ────────────────────────────────────────────────
    const jobsByZip: Record<string, number> = {};
    for (const p of propertiesResult) {
      const zip = (p as any).zipCode;
      if (zip) jobsByZip[zip] = (jobsByZip[zip] || 0) + 1;
    }

    // ── AI risk levels ─────────────────────────────────────────────
    let lowRisk = 0;
    let medRisk = 0;
    let highRisk = 0;
    let totalConf = 0;
    for (const pred of predictionsResult) {
      const deny = Number(pred.probabilityDeny || 0);
      if (deny >= 60) highRisk++;
      else if (deny >= 30) medRisk++;
      else lowRisk++;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      totalConf += Number(pred.confidenceScore || 0);
    }
    const aiPredictedApproval =
      predictionsResult.length > 0
        ? predictionsResult.filter((p: any) => Number(p.probabilityFull || 0) >= 50).length /
          predictionsResult.length
        : 0;

    // ── Red flags (computed from claims heuristics) ────────────────
    const staleInspection = rangeClaims.filter((c: any) => {
      const norm = normalizeStatus(c.status);
      return (
        (norm === "inspection_scheduled" || norm === "inspection") &&
        c.updatedAt < new Date(now.getTime() - 14 * 86_400_000)
      );
    }).length;

    const staleEstimate = rangeClaims.filter((c: any) => {
      const norm = normalizeStatus(c.status);
      return (
        (norm === "estimate_drafting" || norm === "submitted") &&
        c.updatedAt < new Date(now.getTime() - 21 * 86_400_000)
      );
    }).length;

    const staleReview = rangeClaims.filter((c: any) => {
      const norm = normalizeStatus(c.status);
      return norm === "in_review" && c.updatedAt < new Date(now.getTime() - 30 * 86_400_000);
    }).length;

    const missingValues = rangeClaims.filter(
      (c: any) => !c.estimatedValue && normalizeStatus(c.status) !== "new"
    ).length;

    const redFlags = [
      staleInspection > 0 && {
        type: "Stale Inspections (14d+)",
        count: staleInspection,
        severity: "medium" as const,
      },
      staleEstimate > 0 && {
        type: "Stale Estimates (21d+)",
        count: staleEstimate,
        severity: "high" as const,
      },
      staleReview > 0 && {
        type: "Long Review Queue (30d+)",
        count: staleReview,
        severity: "high" as const,
      },
      missingValues > 0 && {
        type: "Missing Estimated Value",
        count: missingValues,
        severity: "low" as const,
      },
      supplementCount > 0 && {
        type: "Open Supplements",
        count: supplementCount,
        severity: "medium" as const,
      },
    ].filter(Boolean);

    // ── Assemble full KPIData shape ────────────────────────────────
    const kpiData = {
      claimsPerStage: orderedStages,
      avgCycleTime,
      approvalRatio: Math.round(approvalRatio * 100) / 100,
      supplementCount,
      supplementRatio: Math.round(supplementRatio * 100) / 100,
      avgRoofSize,
      avgMaterialCost,
      totalRevenue, // in cents from payments
      revenueByOrg: {} as Record<string, number>, // Single-org — not applicable
      jobsByZip,
      aiRiskLevels: {
        low: lowRisk,
        medium: medRisk,
        high: highRisk,
      },
      aiPredictedApproval: Math.round(aiPredictedApproval * 100) / 100,
      redFlags,
    };

    return NextResponse.json(kpiData);
  } catch (err) {
    logger.error("[KPI_ERROR]", err);
    return NextResponse.json({ error: "Failed to load KPIs" }, { status: 500 });
  }
});
