/**
 * Claim Simulation Engine — Outcome Prediction
 *
 * The brain of SkaiScraper's AI Claim Infrastructure.
 * Takes ALL claim data and produces a probability score that the
 * claim will be approved, partially approved, or denied — BEFORE submission.
 *
 * Scoring Categories (weighted):
 *   1. Storm Evidence     (20%) — Weather verification strength
 *   2. Damage Evidence    (25%) — Detection quality + quantity
 *   3. Collateral Evidence(15%) — Non-roof damage corroboration
 *   4. Repairability      (10%) — Repair vs replace indicators
 *   5. Documentation      (15%) — Packet readiness (ClaimIQ)
 *   6. Code Compliance     (5%) — Building code factors
 *   7. Carrier History    (10%) — Historical patterns with carrier
 *
 * Phase 2.1 of the Claim Simulation + Storm Graph system.
 */

import { createId } from "@paralleldrive/cuid2";

import { DOL_CONFIG, SIMULATION_CONFIG } from "@/lib/intelligence/tuning-config";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SimulationFactor {
  category: string;
  description: string;
  impact: "high" | "medium" | "low";
  icon: "✓" | "⚠" | "✗";
}

export interface SimulationRecommendation {
  priority: number;
  action: string;
  estimatedImpact: number; // points gained if completed
  category: string;
  effort: "quick" | "moderate" | "involved";
}

export interface StormGraphBonus {
  nearbyVerifiedDamage: number;
  clusterConfidence: "high" | "medium" | "low" | "none";
  corroborationScore: number;
}

export interface ClaimSimulationResult {
  claimId: string;

  // Overall prediction
  approvalProbability: number; // 0-100
  predictedOutcome: "approved" | "partial" | "denied";
  confidenceLevel: "high" | "medium" | "low";

  // Category scores (each 0-100)
  scores: {
    stormEvidence: number;
    damageEvidence: number;
    collateralEvidence: number;
    repairability: number;
    documentationCompleteness: number;
    codeCompliance: number;
    carrierHistory: number;
  };

  // Factors
  positiveFactors: SimulationFactor[];
  negativeFactors: SimulationFactor[];

  // Recommendations
  recommendations: SimulationRecommendation[];

  // Storm Graph bonus (populated by storm-graph engine)
  stormGraphBonus: StormGraphBonus | null;

  // Metadata
  engineVersion: string;
  computedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ENGINE_VERSION = SIMULATION_CONFIG.version;

const WEIGHTS = SIMULATION_CONFIG.weights;

// ─────────────────────────────────────────────────────────────────────────────
// Main Engine
// ─────────────────────────────────────────────────────────────────────────────

export async function runClaimSimulation(
  claimId: string,
  orgId: string
): Promise<ClaimSimulationResult> {
  const startTime = Date.now();

  // ── First fetch claim to use for dependent queries ───────────────────
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      orgId: true,
      carrier: true,
      damageType: true,
      dateOfLoss: true,
      status: true,
      estimatedValue: true,
      catStormEventId: true,
      propertyId: true,
    },
  });

  if (!claim) {
    throw new Error(`Claim ${claimId} not found`);
  }

  // ── Parallel data fetch ──────────────────────────────────────────────
  const [
    propertyProfile,
    weatherReport,
    stormEvidence,
    detections,
    damageAssessment,
    damageFindings,
    claimAnalysis,
    photos,
    scopeItems,
    supplements,
    codeRequirements,
    carrierOutcomes,
    stormCluster,
  ] = await Promise.all([
    // Property profile
    prisma.property_profiles.findUnique({
      where: { propertyId: claim.propertyId },
      select: {
        roofType: true,
        roofAge: true,
        hailRiskScore: true,
        windRiskScore: true,
        latitude: true,
        longitude: true,
      },
    }),
    // Weather
    prisma.weather_reports.findFirst({
      where: { claimId },
      orderBy: { createdAt: "desc" },
      select: {
        overallAssessment: true,
        confidence: true,
        primaryPeril: true,
        events: true,
        globalSummary: true,
      },
    }),
    // Storm evidence
    prisma.storm_evidence.findUnique({
      where: { claimId },
      select: {
        overallScore: true,
        evidenceGrade: true,
        hailSizeInches: true,
        windSpeedMph: true,
        dolConfidence: true,
        photoCorrelations: true,
        correlationScore: true,
        aiNarrative: true,
        primaryPeril: true,
      },
    }),
    // Detections
    prisma.claim_detections.findMany({
      where: { claimId },
      select: {
        modelGroup: true,
        className: true,
        confidence: true,
        severity: true,
        perilType: true,
        componentType: true,
        isCollateral: true,
        isCodeViolation: true,
        isReplacement: true,
        isSoftMetal: true,
      },
    }),
    // Damage assessment
    prisma.damage_assessments.findFirst({
      where: { claim_id: claimId },
      orderBy: { created_at: "desc" },
      select: {
        overall_recommendation: true,
        confidence: true,
        primaryPeril: true,
      },
    }),
    // Damage findings
    prisma.damage_findings.findMany({
      where: {
        damage_assessments: { claim_id: claimId },
      },
      select: {
        damage_type: true,
        severity: true,
        peril_attribution: true,
        recommended_action: true,
        material: true,
      },
    }),
    // Claim analysis
    prisma.claim_analysis.findUnique({
      where: { claim_id: claimId },
      select: {
        code_flags: true,
        risk_flags: true,
        damages: true,
        materials: true,
      },
    }),
    // Photos
    prisma.file_assets.count({
      where: { orgId, claimId, category: "photo" },
    }),
    // Scope items
    prisma.scopes.count({
      where: { claim_id: claimId },
    }),
    // Supplements
    prisma.supplements.findMany({
      where: { claim_id: claimId },
      select: { status: true, total: true },
    }),
    // Code requirements
    prisma.code_requirements.count({
      where: { orgId },
    }),
    // Carrier history (outcomes for same carrier)
    claim.carrier
      ? prisma.claim_outcomes.findMany({
          where: { orgId, carrier: claim.carrier },
          select: {
            outcome: true,
            approvalPercent: true,
            daysToResolve: true,
            supplementsWon: true,
            supplementsLost: true,
          },
        })
      : Promise.resolve([]),
    // Storm cluster (if linked to storm event)
    claim.catStormEventId
      ? prisma.storm_clusters.findFirst({
          where: { stormEventId: claim.catStormEventId, orgId },
          orderBy: { computedAt: "desc" },
          select: {
            corroborationScore: true,
            corroborationLevel: true,
            claimsInCluster: true,
            verifiedDamage: true,
          },
        })
      : Promise.resolve(null),
  ]);

  // ── Score each category ────────────────────────────────────────────────
  const positiveFactors: SimulationFactor[] = [];
  const negativeFactors: SimulationFactor[] = [];
  const recommendations: SimulationRecommendation[] = [];
  let recPriority = 0;

  // 1. STORM EVIDENCE (0-100)
  const stormScore = scoreStormEvidence(
    weatherReport,
    stormEvidence,
    positiveFactors,
    negativeFactors,
    recommendations,
    recPriority
  );
  recPriority = recommendations.length;

  // 2. DAMAGE EVIDENCE (0-100)
  const damageScore = scoreDamageEvidence(
    detections,
    damageFindings,
    damageAssessment,
    photos,
    positiveFactors,
    negativeFactors,
    recommendations,
    recPriority
  );
  recPriority = recommendations.length;

  // 3. COLLATERAL EVIDENCE (0-100)
  const collateralScore = scoreCollateralEvidence(
    detections,
    damageFindings,
    positiveFactors,
    negativeFactors,
    recommendations,
    recPriority
  );
  recPriority = recommendations.length;

  // 4. REPAIRABILITY (0-100)
  const repairScore = scoreRepairability(
    damageFindings,
    claimAnalysis,
    propertyProfile,
    detections,
    positiveFactors,
    negativeFactors,
    recommendations,
    recPriority
  );
  recPriority = recommendations.length;

  // 5. DOCUMENTATION (0-100)
  const docScore = scoreDocumentation(
    photos,
    scopeItems,
    weatherReport,
    stormEvidence,
    supplements,
    positiveFactors,
    negativeFactors,
    recommendations,
    recPriority
  );
  recPriority = recommendations.length;

  // 6. CODE COMPLIANCE (0-100)
  const codeScore = scoreCodeCompliance(
    claimAnalysis,
    codeRequirements,
    positiveFactors,
    negativeFactors,
    recommendations,
    recPriority
  );
  recPriority = recommendations.length;

  // 7. CARRIER HISTORY (0-100)
  const carrierScore = scoreCarrierHistory(
    carrierOutcomes,
    claim.carrier,
    positiveFactors,
    negativeFactors,
    recommendations,
    recPriority
  );

  // ── Calculate weighted overall score ───────────────────────────────────
  const scores = {
    stormEvidence: stormScore,
    damageEvidence: damageScore,
    collateralEvidence: collateralScore,
    repairability: repairScore,
    documentationCompleteness: docScore,
    codeCompliance: codeScore,
    carrierHistory: carrierScore,
  };

  let approvalProbability = Math.round(
    scores.stormEvidence * WEIGHTS.stormEvidence +
      scores.damageEvidence * WEIGHTS.damageEvidence +
      scores.collateralEvidence * WEIGHTS.collateralEvidence +
      scores.repairability * WEIGHTS.repairability +
      scores.documentationCompleteness * WEIGHTS.documentationCompleteness +
      scores.codeCompliance * WEIGHTS.codeCompliance +
      scores.carrierHistory * WEIGHTS.carrierHistory
  );

  // Storm Graph bonus
  let stormGraphBonus: StormGraphBonus | null = null;
  if (stormCluster) {
    stormGraphBonus = {
      nearbyVerifiedDamage: stormCluster.verifiedDamage,
      clusterConfidence: stormCluster.corroborationLevel as StormGraphBonus["clusterConfidence"],
      corroborationScore: stormCluster.corroborationScore,
    };
    // Bonus: up to +8 points for strong corroboration
    const corroborationBonus = Math.round((stormCluster.corroborationScore / 100) * 8);
    approvalProbability = Math.min(100, approvalProbability + corroborationBonus);

    if (stormCluster.corroborationLevel === "high") {
      positiveFactors.push({
        category: "Storm Graph",
        description: `${stormCluster.claimsInCluster} nearby claims corroborate damage — cluster confidence HIGH`,
        impact: "high",
        icon: "✓",
      });
    }
  }

  // Clamp
  approvalProbability = Math.max(0, Math.min(100, approvalProbability));

  // Predicted outcome
  const predictedOutcome: ClaimSimulationResult["predictedOutcome"] =
    approvalProbability >= 70 ? "approved" : approvalProbability >= 45 ? "partial" : "denied";

  // Confidence level
  const allScores = Object.values(scores);
  const scoreVariance =
    allScores.reduce((sum, s) => sum + Math.pow(s - approvalProbability, 2), 0) / allScores.length;
  const confidenceLevel: ClaimSimulationResult["confidenceLevel"] =
    scoreVariance < 200 ? "high" : scoreVariance < 500 ? "medium" : "low";

  // Sort recommendations by estimated impact
  recommendations.sort((a, b) => b.estimatedImpact - a.estimatedImpact);

  const elapsed = Date.now() - startTime;
  logger.info("[SIMULATION] Claim simulation complete", {
    claimId,
    approvalProbability,
    predictedOutcome,
    confidenceLevel,
    elapsed: `${elapsed}ms`,
  });

  const result: ClaimSimulationResult = {
    claimId,
    approvalProbability,
    predictedOutcome,
    confidenceLevel,
    scores,
    positiveFactors,
    negativeFactors,
    recommendations: recommendations.slice(0, 8),
    stormGraphBonus,
    engineVersion: ENGINE_VERSION,
    computedAt: new Date().toISOString(),
  };

  // ── Persist simulation result ──────────────────────────────────────────
  await persistSimulation(claimId, orgId, result);

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Scoring Functions
// ─────────────────────────────────────────────────────────────────────────────

function scoreStormEvidence(
  weatherReport: {
    overallAssessment: string | null;
    confidence: number | null;
    events: unknown;
  } | null,
  stormEvidence: {
    overallScore: number;
    evidenceGrade: string | null;
    hailSizeInches: number | null;
    windSpeedMph: number | null;
    dolConfidence: number | null;
    correlationScore: number | null;
    photoCorrelations: unknown;
  } | null,
  pos: SimulationFactor[],
  neg: SimulationFactor[],
  recs: SimulationRecommendation[],
  recStart: number
): number {
  let score = 0;

  // Storm evidence score (0-100 already)
  if (stormEvidence) {
    score += stormEvidence.overallScore * 0.5; // 50% from evidence score

    if (stormEvidence.evidenceGrade === "A" || stormEvidence.evidenceGrade === "B") {
      pos.push({
        category: "Storm Evidence",
        description: `Storm evidence grade: ${stormEvidence.evidenceGrade}`,
        impact: "high",
        icon: "✓",
      });
    } else if (stormEvidence.evidenceGrade) {
      neg.push({
        category: "Storm Evidence",
        description: `Storm evidence grade only ${stormEvidence.evidenceGrade}`,
        impact: "medium",
        icon: "⚠",
      });
    }

    if (stormEvidence.hailSizeInches && stormEvidence.hailSizeInches >= 1.0) {
      pos.push({
        category: "Storm Evidence",
        description: `Hail size ${stormEvidence.hailSizeInches}" detected — significant damage threshold`,
        impact: "high",
        icon: "✓",
      });
      score += 20;
    } else if (stormEvidence.hailSizeInches && stormEvidence.hailSizeInches >= 0.75) {
      pos.push({
        category: "Storm Evidence",
        description: `Hail size ${stormEvidence.hailSizeInches}" detected`,
        impact: "medium",
        icon: "✓",
      });
      score += 10;
    }

    if (stormEvidence.windSpeedMph && stormEvidence.windSpeedMph >= 60) {
      pos.push({
        category: "Storm Evidence",
        description: `Wind speed ${stormEvidence.windSpeedMph} mph — severe threshold`,
        impact: "high",
        icon: "✓",
      });
      score += 15;
    } else if (stormEvidence.windSpeedMph && stormEvidence.windSpeedMph >= 40) {
      pos.push({
        category: "Storm Evidence",
        description: `Wind speed ${stormEvidence.windSpeedMph} mph detected`,
        impact: "medium",
        icon: "✓",
      });
      score += 8;
    }

    if (stormEvidence.dolConfidence && stormEvidence.dolConfidence >= 0.8) {
      // DOL interpretation using DOL_CONFIG severity + confidence tiers
      const dolSeverity = interpretDolSeverity(stormEvidence.dolConfidence);
      const dolConf = interpretDolConfidence(stormEvidence.dolConfidence);
      const boost =
        DOL_CONFIG.simulationBoost[dolSeverity.tier as keyof typeof DOL_CONFIG.simulationBoost] ??
        10;
      score += boost;
      pos.push({
        category: "Storm Evidence",
        description: `Date of Loss confidence ${dolConf.label} (${Math.round(stormEvidence.dolConfidence * 100)}%) — ${dolSeverity.label} severity (+${boost} pts)`,
        impact: dolSeverity.tier === "high" ? "high" : "medium",
        icon: "✓",
      });
    } else if (
      stormEvidence.dolConfidence &&
      stormEvidence.dolConfidence >= DOL_CONFIG.severity.moderate
    ) {
      const dolSeverity = interpretDolSeverity(stormEvidence.dolConfidence);
      const boost =
        DOL_CONFIG.simulationBoost[dolSeverity.tier as keyof typeof DOL_CONFIG.simulationBoost] ??
        5;
      score += boost;
      pos.push({
        category: "Storm Evidence",
        description: `Date of Loss confidence moderate (${Math.round(stormEvidence.dolConfidence * 100)}%) — ${dolSeverity.label} (+${boost} pts)`,
        impact: "medium",
        icon: "✓",
      });
    } else if (
      stormEvidence.dolConfidence &&
      stormEvidence.dolConfidence >= DOL_CONFIG.severity.low
    ) {
      score += DOL_CONFIG.simulationBoost.low;
      neg.push({
        category: "Storm Evidence",
        description: `Date of Loss confidence low (${Math.round(stormEvidence.dolConfidence * 100)}%) — weak weather correlation`,
        impact: "low",
        icon: "⚠",
      });
    }

    // Photo correlation score (photos taken within storm window)
    if (stormEvidence.correlationScore && stormEvidence.correlationScore >= 0.7) {
      score += 10;
      pos.push({
        category: "Storm Evidence",
        description: `${Math.round(stormEvidence.correlationScore * 100)}% of photos within storm window — strong temporal correlation`,
        impact: "medium",
        icon: "✓",
      });
    } else if (stormEvidence.correlationScore && stormEvidence.correlationScore >= 0.4) {
      score += 5;
      pos.push({
        category: "Storm Evidence",
        description: `${Math.round(stormEvidence.correlationScore * 100)}% of photos within storm window`,
        impact: "low",
        icon: "✓",
      });
    } else if (stormEvidence.correlationScore !== null && stormEvidence.correlationScore < 0.3) {
      neg.push({
        category: "Storm Evidence",
        description: `Only ${Math.round((stormEvidence.correlationScore || 0) * 100)}% of photos within storm window — weak temporal correlation`,
        impact: "medium",
        icon: "⚠",
      });
      recs.push({
        priority: recStart + 2,
        action: "Verify photo timestamps match claimed date of loss",
        estimatedImpact: 10,
        category: "Storm Evidence",
        effort: "moderate",
      });
    }
  } else {
    neg.push({
      category: "Storm Evidence",
      description: "No storm evidence collected",
      impact: "high",
      icon: "✗",
    });
    recs.push({
      priority: recStart + 1,
      action: "Run storm evidence collection for this claim",
      estimatedImpact: 20,
      category: "Storm Evidence",
      effort: "quick",
    });
  }

  // Weather report
  if (weatherReport) {
    if (weatherReport.confidence && weatherReport.confidence >= 0.7) {
      score += Math.round(weatherReport.confidence * 15);
      pos.push({
        category: "Storm Evidence",
        description: `Weather verification confidence: ${Math.round(weatherReport.confidence * 100)}%`,
        impact: "medium",
        icon: "✓",
      });
    }
    if (
      weatherReport.overallAssessment === "confirmed" ||
      weatherReport.overallAssessment === "likely"
    ) {
      pos.push({
        category: "Storm Evidence",
        description: `Weather assessment: ${weatherReport.overallAssessment}`,
        impact: "high",
        icon: "✓",
      });
    }
  } else {
    recs.push({
      priority: recStart + 2,
      action: "Run weather verification for date of loss",
      estimatedImpact: 15,
      category: "Storm Evidence",
      effort: "quick",
    });
  }

  return Math.min(100, Math.max(0, score));
}

function scoreDamageEvidence(
  detections: Array<{
    modelGroup: string;
    className: string;
    confidence: number;
    severity: string | null;
    isReplacement: boolean;
  }>,
  findings: Array<{
    damage_type: string;
    severity: string | null;
    recommended_action: string | null;
  }>,
  assessment: { confidence: number | null } | null,
  photoCount: number,
  pos: SimulationFactor[],
  neg: SimulationFactor[],
  recs: SimulationRecommendation[],
  recStart: number
): number {
  let score = 0;

  // Detection count scoring
  const totalDetections = detections.length;
  if (totalDetections >= 15) {
    score += 40;
    pos.push({
      category: "Damage Evidence",
      description: `${totalDetections} damage detections identified`,
      impact: "high",
      icon: "✓",
    });
  } else if (totalDetections >= 8) {
    score += 25;
    pos.push({
      category: "Damage Evidence",
      description: `${totalDetections} damage detections identified`,
      impact: "medium",
      icon: "✓",
    });
  } else if (totalDetections >= 3) {
    score += 15;
    neg.push({
      category: "Damage Evidence",
      description: `Only ${totalDetections} detections — more evidence recommended`,
      impact: "medium",
      icon: "⚠",
    });
  } else if (totalDetections > 0) {
    score += 5;
    neg.push({
      category: "Damage Evidence",
      description: `Only ${totalDetections} detection(s) — weak evidence`,
      impact: "high",
      icon: "⚠",
    });
    recs.push({
      priority: recStart + 1,
      action: "Upload more photos and run detection analysis",
      estimatedImpact: 15,
      category: "Damage Evidence",
      effort: "moderate",
    });
  } else {
    neg.push({
      category: "Damage Evidence",
      description: "No YOLO detections — run photo analysis",
      impact: "high",
      icon: "✗",
    });
    recs.push({
      priority: recStart + 1,
      action: "Upload inspection photos and run AI detection",
      estimatedImpact: 25,
      category: "Damage Evidence",
      effort: "moderate",
    });
  }

  // High confidence detections
  const highConf = detections.filter((d) => d.confidence >= 0.7);
  if (highConf.length >= 5) {
    score += 20;
    pos.push({
      category: "Damage Evidence",
      description: `${highConf.length} high-confidence detections (>70%)`,
      impact: "high",
      icon: "✓",
    });
  } else if (highConf.length > 0) {
    score += 10;
  }

  // Severity distribution
  const severeDetections = detections.filter(
    (d) => d.severity === "severe" || d.severity === "critical"
  );
  if (severeDetections.length > 0) {
    score += 15;
    pos.push({
      category: "Damage Evidence",
      description: `${severeDetections.length} severe/critical damage detection(s)`,
      impact: "high",
      icon: "✓",
    });
  }

  // Damage findings
  if (findings.length >= 5) {
    score += 15;
  } else if (findings.length > 0) {
    score += 8;
  }

  // Photo count
  if (photoCount >= 20) {
    score += 10;
    pos.push({
      category: "Damage Evidence",
      description: `${photoCount} photos documented`,
      impact: "medium",
      icon: "✓",
    });
  } else if (photoCount >= 10) {
    score += 5;
  } else if (photoCount < 5) {
    neg.push({
      category: "Damage Evidence",
      description: `Only ${photoCount} photos — more documentation needed`,
      impact: "medium",
      icon: "⚠",
    });
    recs.push({
      priority: recStart + 2,
      action: "Capture more inspection photos (target 20+)",
      estimatedImpact: 10,
      category: "Damage Evidence",
      effort: "moderate",
    });
  }

  return Math.min(100, Math.max(0, score));
}

function scoreCollateralEvidence(
  detections: Array<{
    isCollateral: boolean;
    isSoftMetal: boolean;
    modelGroup: string;
    className: string;
    componentType: string | null;
  }>,
  findings: Array<{ damage_type: string; peril_attribution: string | null }>,
  pos: SimulationFactor[],
  neg: SimulationFactor[],
  recs: SimulationRecommendation[],
  recStart: number
): number {
  let score = 0;

  // Collateral detections
  const collateralDetections = detections.filter((d) => d.isCollateral);
  const softMetalDetections = detections.filter((d) => d.isSoftMetal);
  const collateralTypes = new Set(collateralDetections.map((d) => d.componentType || d.className));
  const softMetalTypes = new Set(softMetalDetections.map((d) => d.componentType || d.className));

  // Multi-source collateral
  if (collateralTypes.size >= 3) {
    score += 40;
    pos.push({
      category: "Collateral Evidence",
      description: `${collateralTypes.size} types of collateral damage confirmed`,
      impact: "high",
      icon: "✓",
    });
  } else if (collateralTypes.size >= 2) {
    score += 25;
    pos.push({
      category: "Collateral Evidence",
      description: `${collateralTypes.size} types of collateral damage found`,
      impact: "medium",
      icon: "✓",
    });
  } else if (collateralTypes.size === 1) {
    score += 15;
    neg.push({
      category: "Collateral Evidence",
      description: "Only 1 collateral damage type — more sources strengthen claim",
      impact: "medium",
      icon: "⚠",
    });
  } else {
    neg.push({
      category: "Collateral Evidence",
      description: "No collateral damage detected",
      impact: "high",
      icon: "⚠",
    });
    recs.push({
      priority: recStart + 1,
      action: "Photograph collateral damage: AC unit fins, gutters, window screens, mailbox",
      estimatedImpact: 15,
      category: "Collateral Evidence",
      effort: "moderate",
    });
  }

  // Soft metal evidence (critical for hail claims)
  if (softMetalTypes.size >= 3) {
    score += 35;
    pos.push({
      category: "Collateral Evidence",
      description: `Soft metal denting confirmed on ${softMetalTypes.size} components — strong hail evidence`,
      impact: "high",
      icon: "✓",
    });
  } else if (softMetalTypes.size >= 1) {
    score += 20;
    pos.push({
      category: "Collateral Evidence",
      description: "Soft metal denting detected",
      impact: "medium",
      icon: "✓",
    });
  } else {
    recs.push({
      priority: recStart + 2,
      action:
        "Capture close-up photos of ridge vents, gutters, and flashing for soft metal denting",
      estimatedImpact: 12,
      category: "Collateral Evidence",
      effort: "moderate",
    });
  }

  // Detection model groups coverage
  const groups = new Set(detections.map((d) => d.modelGroup));
  if (groups.has("collateral")) score += 10;
  if (groups.has("soft_metals")) score += 10;
  if (groups.has("spatter")) score += 5;

  return Math.min(100, Math.max(0, score));
}

function scoreRepairability(
  findings: Array<{
    recommended_action: string | null;
    severity: string | null;
    material: string | null;
  }>,
  claimAnalysis: { code_flags: unknown; risk_flags: unknown; materials: unknown } | null,
  propertyProfile: { roofAge: number | null; roofType: string | null } | null | undefined,
  detections: Array<{ isReplacement: boolean; isCodeViolation: boolean }>,
  pos: SimulationFactor[],
  neg: SimulationFactor[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  recs: SimulationRecommendation[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  recStart: number
): number {
  let score = 50; // Start at 50 (neutral)

  // Replacement indicators from detections
  const replacementCount = detections.filter((d) => d.isReplacement).length;
  if (replacementCount >= 3) {
    score += 25;
    pos.push({
      category: "Repairability",
      description: `${replacementCount} replacement indicators detected — supports full replacement`,
      impact: "high",
      icon: "✓",
    });
  } else if (replacementCount > 0) {
    score += 15;
    pos.push({
      category: "Repairability",
      description: "Replacement indicators present",
      impact: "medium",
      icon: "✓",
    });
  }

  // Roof age (older = more likely to need replacement)
  if (propertyProfile?.roofAge) {
    if (propertyProfile.roofAge >= 20) {
      score += 15;
      pos.push({
        category: "Repairability",
        description: `Roof age ${propertyProfile.roofAge} years — approaching end of life`,
        impact: "medium",
        icon: "✓",
      });
    } else if (propertyProfile.roofAge >= 12) {
      score += 8;
    } else if (propertyProfile.roofAge < 5) {
      score -= 10;
      neg.push({
        category: "Repairability",
        description: `Roof only ${propertyProfile.roofAge} years old — carrier may push repair`,
        impact: "medium",
        icon: "⚠",
      });
    }
  }

  // Findings with "replace" recommendation
  const replaceFindings = findings.filter((f) =>
    f.recommended_action?.toLowerCase().includes("replace")
  );
  if (replaceFindings.length >= 3) {
    score += 15;
  } else if (replaceFindings.length > 0) {
    score += 8;
  }

  // Code violations (mandate replacement)
  const codeViolations = detections.filter((d) => d.isCodeViolation);
  if (codeViolations.length > 0) {
    score += 10;
    pos.push({
      category: "Repairability",
      description: `${codeViolations.length} code violation(s) detected — may mandate upgrade`,
      impact: "medium",
      icon: "✓",
    });
  }

  // Risk flags from analysis
  if (claimAnalysis?.risk_flags) {
    const flags = claimAnalysis.risk_flags as string[];
    if (flags.length > 0) {
      score += Math.min(10, flags.length * 3);
    }
  }

  return Math.min(100, Math.max(0, score));
}

function scoreDocumentation(
  photoCount: number,
  scopeCount: number,
  weatherReport: unknown,
  stormEvidence: unknown,
  supplements: Array<{ status: string }>,
  pos: SimulationFactor[],
  neg: SimulationFactor[],
  recs: SimulationRecommendation[],
  recStart: number
): number {
  let score = 0;
  let completeness = 0;
  const total = 6; // 6 documentation components

  // Photos
  if (photoCount >= 15) {
    completeness++;
    score += 20;
  } else if (photoCount >= 5) {
    completeness += 0.5;
    score += 10;
  }

  // Scope
  if (scopeCount > 0) {
    completeness++;
    score += 20;
    pos.push({
      category: "Documentation",
      description: "Scope/estimate documented",
      impact: "medium",
      icon: "✓",
    });
  } else {
    recs.push({
      priority: recStart + 1,
      action: "Add scope and pricing to claim",
      estimatedImpact: 10,
      category: "Documentation",
      effort: "moderate",
    });
  }

  // Weather report
  if (weatherReport) {
    completeness++;
    score += 20;
  }

  // Storm evidence
  if (stormEvidence) {
    completeness++;
    score += 20;
  }

  // Supplements
  if (supplements.length > 0) {
    completeness++;
    score += 10;
  }

  // Overall completeness bonus
  const pct = completeness / total;
  if (pct >= 0.8) {
    score += 10;
    pos.push({
      category: "Documentation",
      description: `Documentation ${Math.round(pct * 100)}% complete`,
      impact: "high",
      icon: "✓",
    });
  } else if (pct < 0.5) {
    neg.push({
      category: "Documentation",
      description: `Documentation only ${Math.round(pct * 100)}% complete`,
      impact: "high",
      icon: "⚠",
    });
  }

  return Math.min(100, Math.max(0, score));
}

function scoreCodeCompliance(
  claimAnalysis: { code_flags: unknown } | null,
  codeRequirementCount: number,
  pos: SimulationFactor[],
  neg: SimulationFactor[],
  recs: SimulationRecommendation[],
  recStart: number
): number {
  let score = 60; // Base — most claims don't have code issues

  if (claimAnalysis?.code_flags) {
    const flags = claimAnalysis.code_flags as Array<{ type?: string; description?: string }>;
    const violations = flags.filter((f) => f.type === "violation" || f.type === "upgrade_required");

    if (violations.length > 0) {
      score += 25;
      pos.push({
        category: "Code Compliance",
        description: `${violations.length} code violation(s) strengthen replacement argument`,
        impact: "medium",
        icon: "✓",
      });
    }

    if (flags.length > 0) {
      score += Math.min(15, flags.length * 5);
    }
  }

  if (codeRequirementCount === 0) {
    recs.push({
      priority: recStart + 1,
      action: "Add local building code requirements for the property region",
      estimatedImpact: 5,
      category: "Code Compliance",
      effort: "moderate",
    });
  }

  return Math.min(100, Math.max(0, score));
}

function scoreCarrierHistory(
  outcomes: Array<{
    outcome: string;
    approvalPercent: number | null;
    daysToResolve: number | null;
    supplementsWon: number;
    supplementsLost: number;
  }>,
  carrier: string | null,
  pos: SimulationFactor[],
  neg: SimulationFactor[],
  recs: SimulationRecommendation[],
  recStart: number
): number {
  if (!carrier || outcomes.length === 0) {
    // No carrier history — neutral score
    return 50;
  }

  const total = outcomes.length;
  const approved = outcomes.filter((o) => o.outcome === "approved").length;
  const partial = outcomes.filter((o) => o.outcome === "partial").length;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const denied = outcomes.filter((o) => o.outcome === "denied").length;
  const approvalRate = ((approved + partial * 0.5) / total) * 100;

  let score = Math.round(approvalRate);

  if (approvalRate >= 70) {
    pos.push({
      category: "Carrier History",
      description: `${carrier} approval rate: ${Math.round(approvalRate)}% (${total} claims)`,
      impact: "medium",
      icon: "✓",
    });
  } else if (approvalRate < 40) {
    neg.push({
      category: "Carrier History",
      description: `${carrier} has low approval rate: ${Math.round(approvalRate)}% — expect pushback`,
      impact: "high",
      icon: "⚠",
    });
    recs.push({
      priority: recStart + 1,
      action: `Strengthen evidence package — ${carrier} has high denial rate`,
      estimatedImpact: 8,
      category: "Carrier History",
      effort: "involved",
    });
  }

  // Supplement win rate bonus
  const totalSupps = outcomes.reduce((s, o) => s + o.supplementsWon + o.supplementsLost, 0);
  const wonSupps = outcomes.reduce((s, o) => s + o.supplementsWon, 0);
  if (totalSupps > 0) {
    const suppRate = (wonSupps / totalSupps) * 100;
    if (suppRate >= 60) {
      score += 10;
      pos.push({
        category: "Carrier History",
        description: `Supplement win rate with ${carrier}: ${Math.round(suppRate)}%`,
        impact: "medium",
        icon: "✓",
      });
    }
  }

  return Math.min(100, Math.max(0, score));
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────────────────────────────────

async function persistSimulation(
  claimId: string,
  orgId: string,
  result: ClaimSimulationResult
): Promise<void> {
  try {
    await prisma.claim_simulations.create({
      data: {
        id: createId(),
        claimId,
        orgId,
        approvalProbability: result.approvalProbability,
        predictedOutcome: result.predictedOutcome,
        confidenceLevel: result.confidenceLevel,
        stormEvidenceScore: result.scores.stormEvidence,
        damageEvidenceScore: result.scores.damageEvidence,
        collateralEvidenceScore: result.scores.collateralEvidence,
        repairabilityScore: result.scores.repairability,
        documentationScore: result.scores.documentationCompleteness,
        codeComplianceScore: result.scores.codeCompliance,
        carrierHistoryScore: result.scores.carrierHistory,
        stormGraphCorroboration: result.stormGraphBonus?.corroborationScore ?? null,
        nearbyVerifiedClaims: result.stormGraphBonus?.nearbyVerifiedDamage ?? 0,
        clusterConfidence: result.stormGraphBonus?.clusterConfidence ?? null,
        positiveFactors: result.positiveFactors as unknown as never,
        negativeFactors: result.negativeFactors as unknown as never,
        recommendations: result.recommendations as unknown as never,
        categoryBreakdown: result.scores as unknown as never,
        engineVersion: result.engineVersion,
      },
    });
  } catch (err) {
    logger.error("[SIMULATION] Failed to persist simulation", { claimId, err });
  }
}

/**
 * Record a simulation score change in history for tracking improvement.
 */
export async function recordSimulationHistory(
  claimId: string,
  orgId: string,
  result: ClaimSimulationResult,
  triggerEvent: string,
  triggerDescription?: string
): Promise<void> {
  try {
    await prisma.simulation_history.create({
      data: {
        id: createId(),
        claimId,
        orgId,
        approvalProbability: result.approvalProbability,
        triggerEvent,
        triggerDescription,
        stormEvidenceScore: result.scores.stormEvidence,
        damageEvidenceScore: result.scores.damageEvidence,
        collateralEvidenceScore: result.scores.collateralEvidence,
        documentationScore: result.scores.documentationCompleteness,
      },
    });
  } catch (err) {
    logger.error("[SIMULATION] Failed to record history", { claimId, err });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOL Interpretation Helpers (driven by DOL_CONFIG in tuning-config)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Interpret a DOL confidence score into a severity tier using DOL_CONFIG thresholds.
 */
function interpretDolSeverity(confidence: number): { tier: string; label: string } {
  if (confidence >= DOL_CONFIG.severity.high) {
    return { tier: "high", label: DOL_CONFIG.labels.high };
  }
  if (confidence >= DOL_CONFIG.severity.moderate) {
    return { tier: "moderate", label: DOL_CONFIG.labels.moderate };
  }
  if (confidence >= DOL_CONFIG.severity.low) {
    return { tier: "low", label: DOL_CONFIG.labels.low };
  }
  return { tier: "minimal", label: DOL_CONFIG.labels.minimal };
}

/**
 * Interpret a DOL confidence score into a confidence label using DOL_CONFIG.
 */
function interpretDolConfidence(confidence: number): { tier: string; label: string } {
  if (confidence >= DOL_CONFIG.confidence.high) {
    return { tier: "high", label: "High" };
  }
  if (confidence >= DOL_CONFIG.confidence.moderate) {
    return { tier: "moderate", label: "Moderate" };
  }
  return { tier: "low", label: "Low" };
}
