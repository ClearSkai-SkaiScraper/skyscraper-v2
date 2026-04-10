/**
 * Packet Intelligence Score API — R4
 *
 * Computes a composite "submission readiness" score server-side:
 *   40% ClaimIQ  +  35% Simulation  +  25% Storm Graph
 *
 * GET /api/claims/[claimId]/packet-score
 */

import { NextRequest, NextResponse } from "next/server";

import { PACKET_SCORE_CONFIG } from "@/lib/intelligence/tuning-config";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PacketScoreResult {
  packetScore: number;
  grade: string;
  components: {
    claimIQ: { score: number; weight: number; weighted: number } | null;
    simulation: { score: number; weight: number; weighted: number } | null;
    stormGraph: { score: number; weight: number; weighted: number } | null;
  };
  recommendation: string;
  computedAt: string;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  const ctx = await safeOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = ctx;
  const { claimId } = await params;

  try {
    // Fetch all three engine scores in parallel
    const [claim, simulation, claimIQData] = await Promise.all([
      prisma.claims.findFirst({
        where: { id: claimId, orgId },
        select: {
          id: true,
          catStormEventId: true,
        },
      }),
      prisma.claim_simulations.findFirst({
        where: { claimId },
        orderBy: { computedAt: "desc" },
      }),
      // ClaimIQ readiness is computed, not stored — import and call directly
      (async () => {
        try {
          const { assessClaimReadiness } = await import("@/lib/claimiq/assembly-engine");
          return await assessClaimReadiness(claimId, orgId);
        } catch {
          return null;
        }
      })(),
    ]);

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Fetch storm clusters if the claim has a storm event
    let stormScore: number | null = null;
    if (claim.catStormEventId) {
      const topCluster = await prisma.storm_clusters.findFirst({
        where: { stormEventId: claim.catStormEventId, orgId },
        orderBy: { corroborationScore: "desc" },
      });
      stormScore = topCluster?.corroborationScore ?? null;
    }

    // ClaimIQ score (overallScore from readiness assessment, 0-100)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const claimIQScore = (claimIQData as any)?.overallScore ?? (claimIQData as any)?.score ?? null;

    // Simulation score (approvalProbability, 0-100)
    const simScore = simulation?.approvalProbability ?? null;

    // Compute weighted composite
    const WEIGHTS = PACKET_SCORE_CONFIG.weights;
    let totalWeight = 0;
    let weightedSum = 0;

    const components: PacketScoreResult["components"] = {
      claimIQ: null,
      simulation: null,
      stormGraph: null,
    };

    if (claimIQScore != null) {
      const w = WEIGHTS.claimIQ;
      components.claimIQ = {
        score: claimIQScore,
        weight: w,
        weighted: Math.round(claimIQScore * w),
      };
      totalWeight += w;
      weightedSum += claimIQScore * w;
    }

    if (simScore != null) {
      const w = WEIGHTS.simulation;
      components.simulation = {
        score: simScore,
        weight: w,
        weighted: Math.round(simScore * w),
      };
      totalWeight += w;
      weightedSum += simScore * w;
    }

    if (stormScore != null) {
      const w = WEIGHTS.stormGraph;
      components.stormGraph = {
        score: stormScore,
        weight: w,
        weighted: Math.round(stormScore * w),
      };
      totalWeight += w;
      weightedSum += stormScore * w;
    }

    // Normalize if not all engines contributed
    const packetScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    // Grade
    const grade =
      packetScore >= 85
        ? "A"
        : packetScore >= 70
          ? "B"
          : packetScore >= 55
            ? "C"
            : packetScore >= 40
              ? "D"
              : "F";

    // Recommendation
    let recommendation: string;
    if (packetScore >= 85) {
      recommendation =
        "Packet is submission-ready. Strong evidence across all engines. Submit with confidence.";
    } else if (packetScore >= 70) {
      recommendation =
        "Packet is near-ready. Address any remaining evidence gaps before submission.";
    } else if (packetScore >= 55) {
      recommendation =
        "Packet needs improvement. Review negative factors and add missing documentation.";
    } else if (packetScore >= 40) {
      recommendation =
        "Packet is weak. Significant evidence gaps exist. Gather more photos, weather data, and collateral evidence.";
    } else {
      recommendation =
        "Packet is not ready. Major gaps in evidence. Run inspections and upload documentation before proceeding.";
    }

    const result: PacketScoreResult = {
      packetScore,
      grade,
      components,
      recommendation,
      computedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err) {
    logger.error("[PACKET_SCORE_API] Failed:", err);
    return NextResponse.json({ error: "Failed to compute packet score" }, { status: 500 });
  }
}
